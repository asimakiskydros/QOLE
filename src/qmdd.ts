/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Gate } from "./gates";
import { Complex, mapSetReturn } from "./complex";

/**
 * Rounds the given `value` to the specified `decimal` places.
 * @param value The value to round.
 * @param decimals The decimal points of accuracy to keep.
 * @returns The rounded `value`.
 */
function round (value: number, decimals: number): number
{
    const pad = 10 ** decimals;

    return Math.round(value * pad) / pad;
}

/**
 * A weighted directed link connecting two QMDD verteces. 
 */
type _Edge<T extends QMDD> = { dest: T, weight: number };
export type Edge = _Edge<QMDD>;
export type VectorEdge = _Edge<VectorQMDD>;
export type MatrixEdge = _Edge<MatrixQMDD>;

/**
 * A vertex representing the four quadrants of a unitary matrix.
 */
export class QMDD
{
    /**
     * The index of the qubit described by `this` QMDD.
     */
    private readonly variable: number;
    /**
     * The unique identifier of `this` QMDD vertex.
     */
    private id!: number;
    /**
     * The selection probability of `this` QMDD vertex.
     */
    private prob: number;
    /**
     * The outgoing edges of `this` QMDD vertex. Empty for `terminal`.
     */
    public readonly edges: Edge[];

    // unique identifier generator
    private static count: number = 0;
    // lookup tables
    private static verteces = new Map<string, QMDD>();
    private static sums     = new Map<string, Edge>();
    private static prods    = new Map<string, Edge>();

    /**
     * Creates a new `QMDD` vertex (`!!!` unsafely) representing qubit #`variable`, with the given set of `outgoing` edges.
     * Automatically normalizes itself.
     * @param variable The qubit index `this` `Vertex` element represents.
     * @param outgoing The set of outgoing `Edge` objects.
     * @returns A new `QMDD` vertex instance, or an old one, if already existant.
     */
    constructor (variable: number, outgoing: Edge[] = [])
    {
        this.variable = variable;
        this.edges = outgoing;
        this.prob = 1;  // only the terminal should be using the raw constructor (without createVertex immediately after)
                        // so this should be safe
    }

    /**
     * Serializes `this` QMDD vertex. Useful for accessing caches.
     * @returns A serialization in the format of `"var;dest0;dest1;...;w0;w1;.."`
     */
    public toString (): string
    {
        const dests = this.edges.map(edge => edge.dest.id).join(';');
        const weights = this.edges.map(edge => edge.weight).join(';');

        return `${this.variable};${dests};${weights}`;
    }

    /**
     * Normalizes the edges of `this` by the selected rule.
     * 
     * `Rule #1` Divide all weights by the first nonzero weight.
     * 
     * `Rule #2` (Omitted)
     * 
     * `Rule #3` Divide all weights by the first weight exhibiting the maximum magnitude.
     * 
     * @param rule What normalization rule to enforce.
     * @returns The common factor as an index to `Complex`.
     */
    private normalize (rule: 1 | 3 = 3): number
    {
        if (this.isTerminal()) return 1;  // no edges to normalize

        const factor = rule === 1 
            ? this.edges.find(el => el.weight !== 0)!.weight   // Rule 1
            : Complex.argmax(this.edges.map(el => el.weight)); // Rule 3

        if (factor !== 0)
            for (const [i, edge] of this.edges.entries())
                this.edges[i] = { dest: edge.dest, weight: Complex.div(edge.weight, factor) };

        if (this instanceof VectorQMDD)
            // update selection probability
            this.prob = 
                this.edges[0].dest.prob * Complex.get(this.edges[0].weight)!.mag2() + 
                this.edges[1].dest.prob * Complex.get(this.edges[1].weight)!.mag2()

        return factor;
    }

    /**
     * Checks whether `this` `Vertex` object resembles the identity matrix.
     * This occurs when `this` has edges e00, e11 point to the same
     * `Vertex` with the same weight, and e01, e10 are 0-edges.
     * @returns `true` if `this` resembles the identity matrix.
     */
    private isTrivial (): boolean
    {
        if (!(this instanceof VectorQMDD) && !this.isTerminal() && (
            // if e00 and e11 point to a common dest with equal nonzero weight...
            this.edges[0].weight === this.edges[3].weight &&
            this.edges[0].dest === this.edges[3].dest &&
            this.edges[0].weight !== 0 &&
            // ...and e10, e01 are zero-edges...
            this.edges[1].weight === this.edges[2].weight &&
            this.edges[1].weight === 0
        ))
            return true;

        return false;
    }

    /**
     * Checks whether `this` is a redundant `Vertex`. A `Vertex` object is redundant if it's not the terminal
     * and all its edges point to the same destination with the same weight.
     * @returns `true` if `this.edges` is filled with (qualitative) equivalent elements. 
     */
    private isRedundant (): boolean
    {
        return !(this instanceof VectorQMDD) && !this.isTerminal() && this.edges.every(edge =>
            edge.dest === this.edges[0].dest &&
            edge.weight === this.edges[0].weight
        );
    }

    /**
     * Checks whether `this` is the terminal `Vertex`. A `Vertex` object is considered the terminal
     * iff it has no outgoing edges.
     * @returns `true` if the edge list is zero.
     */
    public isTerminal (): boolean
    {
        return this.edges.length === 0;
    }

    /**
     * Safely creates a new `Vertex` terminal for a quantum operator of the given `width`.
     * @param width The number of qubits that will participate in this diagram.
     * @returns A `QMDD Vertex` terminal object.
     */
    public static createTerminal (width: number): QMDD
    {
        let vertex = new QMDD(width);

        // if a terminal with the same width mark was requested before, prioritize it
        if (QMDD.verteces.has(vertex.toString())) vertex = QMDD.verteces.get(vertex.toString())!; 
        // otherwise, put the new terminal into the lookup table
        else 
        {
            QMDD.verteces.set(vertex.toString(), vertex);
            vertex.id = QMDD.count++;
        }
        return vertex;
    }

    /**
     * Safely creates a new `Vertex` object as described and returns an `Edge` pointing to it.
     * 
     * `!!!` Always use this instead of the raw constructor.
     * 
     * If `outgoing` resembles the identity matrix (up to a scalar `ρ`), then the returned `Edge`'s weight
     * is `ρ` and it points to the ancestor `Vertex` (skips this qubit). Otherwise the weight is 1.
     * @param variable The qubit index `this` vertex represents.
     * @param outgoing The set of outgoing edges. The weights will get normalized.
     * @param terminal The global terminal `QMDD Vertex`.
     * @param rule (Optional) The normalization rule to enforce (1 or 3)
     * @returns An `Edge` pointing to the resulting `Vertex` instance.     
     */
    public static createVertex (variable: number, outgoing: Edge[], terminal: QMDD, rule: 1 | 3 = 3): Edge
    {
        let vertex = 
            outgoing.length === 2 ? new VectorQMDD(variable, outgoing[0], outgoing[1]):
            outgoing.length === 4 ? new MatrixQMDD(variable, outgoing[0], outgoing[1], outgoing[2], outgoing[3]):
                                    new QMDD(variable, [...outgoing]);
        let weight = vertex.normalize(rule);

        // due to how vector Verteces are defined here, it can arise that all edge weights are 0
        // in that scenario, the vertex is redundant and its edge becomes a zero edge.
        if (weight === 0) return { dest: terminal, weight: 0 };
        // if trivial or redundant, discard vertex and point to its ancestor
        if (vertex.isTrivial() || vertex.isRedundant()) vertex = vertex.edges[0].dest;
        // if the described vertex already exists, use the old version
        else if (QMDD.verteces.has(vertex.toString())) vertex = QMDD.verteces.get(vertex.toString())!; 
        // put the new vertex into the lookup table
        else 
        {
            QMDD.verteces.set(vertex.toString(), vertex);
            vertex.id = QMDD.count++;
        }

        return { dest: vertex, weight: weight };
    }

    /**
     * Returns a vector `QMDD` initialized on the ground state.
     * @param terminal The global terminal `QMDD Vertex`.
     * @returns An `Edge` object pointing to the ground state vector `QMDD`.
     */
    public static groundState (terminal: QMDD): VectorEdge
    {
        let e = { dest: terminal, weight: 1 };

        for (let variable = terminal.variable - 1; variable > -1; variable--)  // the terminal has the circuit width as variable
            e = QMDD.createVertex(variable, [e, { dest: terminal, weight: 0 }], terminal);

        return e;
    }

    /**
     * Performs addition on the two given `QMDD`s, assumed to represent two equally-sized tensors of the same rank. 
     * @param tensor1 The `Edge` object pointing to the first `QMDD`.
     * @param tensor2 The `Edge` object pointing to the second `QMDD`.
     * @param terminal The global terminal `QMDD Vertex`.
     * @param level (Implementation detail - ignore) The `Vertex` level concerning the operation. 
     * @returns An `Edge` object pointing to the `QMDD` representing the sum of `tensor1` and `tensor2`.
     */
    public static add (tensor1: Edge, tensor2: Edge, terminal: QMDD, level?: number): Edge
    {
        if (level === undefined) level = Math.min(tensor1.dest.variable, tensor2.dest.variable);  // todo: they do nonterminal checks, must proofcheck this

        if (tensor1.weight === 0)
            return { dest: tensor2.weight === 0 ? terminal : tensor2.dest, weight: tensor2.weight };

        if (tensor2.weight === 0)
            return { dest: tensor1.dest, weight: tensor1.weight };

        if (tensor1.dest === tensor2.dest)  // todo: check whether id is needed here or otherwise completely useless
            return { dest: tensor1.dest, weight: Complex.add(tensor1.weight, tensor2.weight) };

        const sorted = [tensor1, tensor2].sort((a, b) => a.dest.id - b.dest.id);
        const key = `${sorted[0].dest.id};${sorted[1].dest.id};${sorted[0].weight};${sorted[1].weight}`; 

        if (QMDD.sums.has(key)) // reuse existing sums
            return { dest: QMDD.sums.get(key)!.dest, weight: QMDD.sums.get(key)!.weight };

        const edges: Edge[] = [];
        const rank = tensor1.dest instanceof VectorQMDD ? 1 : 2;

        for (let i = 0; i < 2 * rank; i++)
        {
            let e0: Edge, e1: Edge;

            if (tensor1.dest.isTerminal() || tensor1.dest.variable > level)
                // if the tensor skips a variable or goes straight to the terminal, handle as if it is an identity
                //                            the e0, e3 quadrants are smaller identities     the e1, e2 quadrants are 0
                e0 = (i === 0 || i === 3) ? { dest: tensor1.dest, weight: tensor1.weight } : { dest: terminal, weight: 0 };
            else
                // select the tensor's ith edge and bubble down the entry weight
                e0 = { dest: tensor1.dest.edges[i].dest, weight: Complex.mul(tensor1.weight, tensor1.dest.edges[i].weight) };

            if (tensor2.dest.isTerminal() || tensor2.dest.variable > level)  // same for the other tensor
                e1 = (i === 0 || i === 3) ? { dest: tensor2.dest, weight: tensor2.weight } : { dest: terminal, weight: 0 };
            else
                e1 = { dest: tensor2.dest.edges[i].dest, weight: Complex.mul(tensor2.weight, tensor2.dest.edges[i].weight) };

            edges.push(QMDD.add(e0, e1, terminal, level + 1));
        }

        return mapSetReturn(QMDD.sums, key, QMDD.createVertex(level, edges, terminal));
    }

    /**
     * Performs matrix-vector multiplication on the given tensor `QMDD`s. `!!!` Order matters. 
     * @param matrix The `Edge` object pointing to the matrix `QMDD`.
     * @param vector The `Edge` object pointing to the vector `QMDD`.
     * @param terminal The global terminal `QMDD Vertex`.
     * @param level (Implementation detail - ignore) The `Vertex` level concerning the operation.
     * @returns An `Edge` object pointing to the `QMDD` representing the product `matrix`*`vector`.
     */
    public static multiply (matrix: MatrixEdge, vector: VectorEdge, terminal: QMDD, level?: number): Edge
    {
        if (level === undefined) level = Math.min(matrix.dest.variable, vector.dest.variable);  // todo: they do nonterminal checks, must proofcheck this

        if (matrix.weight === 0 || vector.weight === 0)
            return { dest: terminal, weight: 0 };

        if (matrix.dest.isTerminal())
            return { dest: vector.dest, weight: Complex.mul(vector.weight, matrix.weight) };

        const key = `${matrix.dest.id};${vector.dest.id};${matrix.weight};${vector.weight}`; 

        if (QMDD.prods.has(key)) // reuse existing products
            return { dest: QMDD.prods.get(key)!.dest, weight: QMDD.prods.get(key)!.weight };

        const edges: VectorEdge[] = [{ dest: terminal, weight: 0 }, { dest: terminal, weight: 0 }];

        for (const i of [0, 1]) for (const j of [0, 1])
        {
            /**                                                              initial edges[i]
             *i = 0: (j=0,1) edges0 = max.e0*vec.e0 + max.e1*vec.e1 (+ 0) <--------|
             *i = 1: (j=0,1) edges1 = max.e2*vec.e0 + max.e3*vec.e1 (+ 0) <--------v
             *=============> edges[i] = max.e[2i+0]*vec[0] + max.e[2i+1]*vec[1] (+ 0)
             *                                   ^       ^            ^       ^ 
             *                                  j=0     j=0          j=1     j=1
             */
            const v: Edge = vector.dest.edges[j];
            const m: Edge = 
                matrix.dest.variable === level ? matrix.dest.edges[2 * i + j] :  // if matrix variable agrees with the level, proceed
                i == j ? { dest: matrix.dest, weight: 1 } : { dest: terminal, weight: 0 };  // otherwise, deal with the matrix as if it is an identity

            // due to the selected order, the level must increase to go down the tree
            edges[i] = QMDD.add(edges[i], QMDD.multiply(m, v, terminal, level + 1), terminal, level + 1);
        }
        const e = QMDD.createVertex(level, edges, terminal);
        return mapSetReturn(QMDD.prods, key, { dest: e.dest, weight: Complex.mul(e.weight, matrix.weight, vector.weight) });  
    }

    /**
     * Constructs the passed `Gate` description as a `QMDD`.
     * @param gate The `Gate` element that operates on the `target` qubit.
     * @param target The index of the target qubit.
     * @param controls Control information concerning the gate. If not controlled, pass an empty list.
     * @param terminal The global terminal `QMDD Vertex`.
     * @returns An `Edge` object pointing to the `QMDD` representing the specified `gate`.
     */
    public static construct (gate: Gate, target: number, controls: { index: number, state: string }[], terminal: QMDD): MatrixEdge
    {
        let q = 0;
        const ctrls = controls.sort((a, b) => b.index - a.index);  // in descending order so deeper indices are first
        const root: MatrixEdge[] = gate.matrix().map(el => ({ dest: terminal, weight: el }));
        const reusable: MatrixEdge[] = [
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: 0 },
            { dest: terminal, weight: 0 },
        ];

        // handle the controls below the target (if no controls, skip)
        for (; q < ctrls.length && ctrls[q].index > target; q++)
            for (const i of [0, 1]) for (const j of [0, 1])
            {
                // a 0-control activates on e0 (0 === 00 -> |0>~>|0>), while an 1-control on e3 (3 === 11 -> |1>~>|1>)
                const [activator, antiactivator] = (ctrls[q].state === '0' ? [0, 3] : [3, 0]);
                const edge = 2 * i + j;
                
                reusable[activator] = root[edge];
                reusable[antiactivator] = { dest: terminal, weight: (i === j ? 1 : 0) };

                root[edge] = QMDD.createVertex(ctrls[q].index, reusable, terminal);
            }

        // handle the target
        let entry = QMDD.createVertex(target, root, terminal);

        // handle the controls above the target (if no controls, skip)
        for (; q < ctrls.length; q++)
        {
            const [activator, antiactivator] = (ctrls[q].state === '0' ? [0, 3] : [3, 0]);

            reusable[activator] = entry;
            reusable[antiactivator] = { dest: terminal, weight: 1 };

            entry = QMDD.createVertex(ctrls[q].index, reusable, terminal);
        }

        return entry;
    }

    /**
     * Constructs an entire uncontrolled step as a unified matrix `QMDD`.
     * @param gates Gate information (operation, target) about the step.
     * @param terminal The global terminal `QMDD Vertex`.
     * @returns An `Edge` object pointing to the matrix `QMDD` implementing the described step.
     */
    public static uncontrolledStep (gates: { operator: Gate, target: number }[], terminal: QMDD): MatrixEdge
    {
        const step = gates.sort((a, b) => b.target - a.target);  // in descending order so deeper targets are first
        let e: MatrixEdge = { dest: terminal, weight: 1 };

        for (const { operator, target } of step)
        {
            const matrix = operator.matrix().map(el => Complex.mul(el, e.weight));
            const edges: MatrixEdge[] = [
                { dest: matrix[0] === 0 ? terminal : e.dest, weight: matrix[0] },
                { dest: matrix[1] === 0 ? terminal : e.dest, weight: matrix[1] },
                { dest: matrix[2] === 0 ? terminal : e.dest, weight: matrix[2] },
                { dest: matrix[3] === 0 ? terminal : e.dest, weight: matrix[3] },
            ];
            e = QMDD.createVertex(target, edges, terminal);
        }

        return e;
    }

    /**
     * Traverses the vector `QMDD` diagram in full, in preorder DFS fashion, to calculate the amplitudes of all nonzero basis states.
     * @param entry The `Edge` pointing to the root of the vector `QMDD`.
     * @param decimals The number of decimal places of precision to keep for the amplitudes.
     * @yields The resulting statevector in chunks of `{state, Re(amp), Im(amp)}`.
     */
    public static* strongSimulate (entry: VectorEdge, decimals: number): Generator<{ state: string, re: number, im: number }>
    {
        if (entry.weight === 0)
            throw new Error(`Error in QMDD.strongSimulate(): The passed entry is a zero edge.`);

        if (entry.dest.isTerminal())
            throw new Error(`Error in QMDD.strongSimulate(): The passed entry is a terminal edge.`);
        
        const stack: { v: QMDD, w: number, s: string}[] = [{ v: entry.dest, w: entry.weight, s: '' }];

        while (stack.length > 0)
        {
            const { v, w, s } = stack.pop()!;

            if (v.isTerminal())
            {
                // states are assumed to be patched and weights are assumed to be nonzero due to the next loop.
                const complex = Complex.get(w)!;
                yield { state: s, re: round(complex.re(), decimals), im: round(complex.im(), decimals) };
                continue;
            }
            // traverse preorderly
            for (const i of [1, 0])
                if (v.edges[i].weight !== 0)
                    stack.push({ v: v.edges[i].dest, w: Complex.mul(w, v.edges[i].weight), s: (i === 0 ? '0' : '1') + s });
        }
    }

    /**
     * Performs single-shot weak simulation on the given `entry` vector `QMDD`.
     * The `QMDD` is not altered during traversal.
     * @param entry The entry `Edge` of the `QMDD` to simulate.
     * @param qubits The number of qubits present in the vector described by the `QMDD`.
     * @param rand A seeded RPNG to decide "collapse" at each qubit with.
     * @returns A `string` describing the "measured" basis state, and its amplitude, as a 'number' pair.
     */
    public static weakSimulate (entry: VectorEdge, qubits: number, rand: () => number): [string, number, number]
    {
        if (entry.weight === 0)
            throw new Error(`Error in QMDD.weakSimulate(): The passed entry is a zero edge.`);

        if (entry.dest.isTerminal())
            throw new Error(`Error in QMDD.weakSimulate(): The passed entry is a terminal edge.`);

        const state = Array(qubits).fill('0');
        let amplitude = entry.weight;

        while (!entry.dest.isTerminal())
        {
            const o0 = entry.dest.edges[0].dest.prob * Complex.get(entry.dest.edges[0].weight)!.mag2();  // "odds" of measuring |0>
            const o1 = entry.dest.edges[1].dest.prob * Complex.get(entry.dest.edges[1].weight)!.mag2();  // "odds" of measuring |1>
            const p0 = o0 / (o0 + o1);  // probability ratio of measuring |0> (the entry weight gets eliminated)

            const i = rand() < p0 ? 0 : 1;
            state[qubits - entry.dest.variable - 1] = String(i);
            amplitude = Complex.mul(amplitude, entry.dest.edges[i].weight);
            entry = entry.dest.edges[i];
        }

        const cmplx = Complex.get(amplitude)!;

        return [state.join(''), cmplx.re(), cmplx.im()];
    }
}

export class VectorQMDD extends QMDD
{
    constructor (variable: number, e0: Edge, e1: Edge)
    {
        super(variable, [e0, e1]);
    }
}

export class MatrixQMDD extends QMDD
{
    constructor (variable: number, e0: Edge, e1: Edge, e2: Edge, e3: Edge)
    {
        super(variable, [e0, e1, e2, e3]);
    }
}