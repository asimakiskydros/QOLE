/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Control, Gate } from "./gates";
import { Complex } from "./complex";

/**
 * Calculates the states of all skipped variables in the path
 * by generating all possible binary numbers for the given number of `bits`.
 * @param variables The number of variables skipped.
 * @yields All valid binary strings, 0-based, starting from the biggest one.
 */
function* skipped (variables: number): Generator<string>
{
    if (variables === 0)
        // return the empty string so the normal case (no vars skipped) can work as well
        yield '';
    else for (let i = (1 << variables) - 1; i >= 0 ; i--)
        yield i.toString(2).padStart(variables, '0');
}

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
export type Edge = { dest: QMDD, weight: number };

/**
 * A vertex representing the four quadrants of a unitary matrix.
 */
export class QMDD
{
    /**
     * `true` if `this` QMDD branch represents the identity matrix.
     */
    public readonly isIdentity: boolean;
    /**
     * The index of the qubit described by `this` QMDD.
     */
    public readonly variable: number;
    /**
     * The unique identifier of `this` QMDD vertex.
     */
    public readonly id!: number;
    /**
     * The local scalar complex value for all edge weights.
     */
    public scalar: number;
    /**
     * The outgoing edges of `this` QMDD vertex. Empty for `terminal`.
     */
    public edges: Edge[];

    // unique identifier generator
    private static count: number = 0;
    // lookup tables
    private static verteces = new Map<string, QMDD>();
    private static sums     = new Map<string, Edge>();
    private static prods    = new Map<string, Edge>();

    /**
     * Creates a new `QMDD` vertex representing qubit #`variable`, with the given set of `outgoing` edges.
     * Automatically normalizes and minimizes itself to save on verteces.
     * @param variable The qubit index `this` vertex represents.
     * @param outgoing The set of outgoing edges. The weights will get normalized.
     * @param scalar (Optional) The global scalar of the vertex. This might change during the vertex' lifetime.
     * @returns A new `QMDD` vertex instance, or an old one, if already existant.
     */
    constructor (variable: number = -1, outgoing: Edge[] = [], scalar: number = 1)
    {
        this.variable = variable;
        [this.edges, this.scalar] = this.normalize(outgoing, scalar);
        this.isIdentity = this.trivialize(); 

        // if the described vertex already exists, use the old version
        if (QMDD.verteces.has(this.toString())) return QMDD.verteces.get(this.toString())!;

        QMDD.verteces.set(this.toString(), this);
        this.id = QMDD.count++;
    }

    /**
     * Normalizes `this` by ensuring the first non-0 edge weight is 1,
     * per 10.1109/CEC.2006.1688610 and Rule 1 in 10.1007/978-3-642-38986-3_11
     * 
     * The common factor is stored in the scalar.
     */
    private normalize (edges: Edge[], scalar: number): [Edge[], number]
    {
        if (edges.length === 0) return [edges, scalar];

        const factor = edges.find(el => el.weight !== 0)!.weight;

        for (const edge of edges)
            edge.weight = Complex.div(edge.weight, factor);

        return [edges, Complex.mul(scalar, factor)];
    }

    /**
     * Self-labels `this` as an identity (or trivial) branch iff
     * it and all of its children follow the (scaled) identity matrix or
     * are the terminal.
     * 
     * Scalar factors are ballooned to the root scalar.
     * 
     * The `QMDD` is assumed to be normalized.
     * 
     * @returns `true` if `this` represents an identity branch. 
     */
    private trivialize (): boolean
    {
        const isIdentity = this.isTerminal() 
            || (this.edges.every((edge, i) => edge.weight === ((i === 0 || i === 3) ? 1 : 0))
            &&  this.edges.every(edge => edge.dest.isIdentity));

        if (isIdentity && !this.isTerminal())
        {
            // pop the common descendant from the cache temporarily
            QMDD.verteces.delete(this.edges[0].dest.toString());

            // balloon the accumulated scalar up to the root of the identity tree,
            // as this makes multiplication faster and only the root will ever be accessed
            this.scalar = Complex.mul(this.scalar, this.edges[0].dest.scalar);
            this.edges[0].dest.scalar = 1;
            
            // re-save the descendand to the cache with the new scalar
            QMDD.verteces.set(this.edges[0].dest.toString(), this.edges[0].dest);
        }

        return isIdentity;
    }

    /**
     * Serializes `this` QMDD vertex. Useful for accessing caches.
     * @returns A serialization in the format of `"var;scalar;dest0;dest1;...;w0;w1;.."`
     */
    public toString (): string
    {
        const dests = this.edges.map(edge => edge.dest.id).join(';');
        const weights = this.edges.map(edge => edge.weight).join(';');

        return `${this.variable};${this.scalar};${dests};${weights}`;
    }

    /**
     * Checks whether `this` is the terminal vertex. A vertex is considered the terminal
     * iff it has no outgoing edges.
     * @returns `true` if the edge list is zero.
     */
    public isTerminal (): boolean
    {
        return this.edges.length === 0;
    }

    /**
     * Adds two QMDDs pointed to by the given edges according to
     * `10.1109/CEC.2006.1688610`.
     * @param e0 An `Edge` pointing to the first `QMDD`.
     * @param e1 An `Edge` pointing to the second `QMDD`.
     * @returns A new `Edge` pointing to the sum `QMDD`.
     */
    public static add (e0: Edge, e1: Edge, terminal: QMDD): Edge
    {
        // sort to ensure identical sums arent saved multiple times (addition is commutative)
        const sorted = [e0, e1].sort((a, b) => a.dest.id - b.dest.id);
        const key = `${sorted[0].dest.id};${sorted[1].dest.id};${sorted[0].weight};${sorted[1].weight}`; 

        if (QMDD.sums.has(key)) // reuse existing sums
            return { dest: QMDD.sums.get(key)!.dest, weight: QMDD.sums.get(key)!.weight };
        
        if (e1.dest.isTerminal())
            [e0, e1] = [e1, e0];
        
        if (e0.weight === 0) // check only the weight as the zero edges must lead to the terminal
            return { dest: e1.dest, weight: e1.weight };

        if (e0.dest.id === e1.dest.id) // if the pointed-to verteces are the same
            return { dest: e0.dest, weight: Complex.add(e0.weight, e1.weight) };

        if (e0.dest.variable > e1.dest.variable) // if e0 precedes e1
            [e0, e1] = [e1, e0];

        const edges: Edge[] = [];

        for (let i = 0; i < 4; i++)
        {
            const e0i = e0.dest.edges[i];
            const e1i = e1.dest.edges[i];
            const p: Edge = { dest: e0i.dest, weight: Complex.mul(e0.dest.scalar, e0.weight, e0i.weight) };
            const q: Edge = e0.dest.variable === e1.dest.variable ?
                { dest: e1i.dest, weight: Complex.mul(e1.dest.scalar, e1.weight, e1i.weight) }: 
                { dest: e1.dest, weight: e1.weight };
            
            const sum = QMDD.add(p, q, terminal);
            edges.push(sum.weight === 0 ? { dest: terminal, weight: 0 } : sum);
        }
        
        const sum = (edges.every(edge => edge.dest === edges[0].dest && edge.weight === edges[0].weight)) ?
            // if all computed edges point to the same vertex with the same weight,
            // skip this sum entirely and point to the common destination
            { dest: edges[0].dest, weight: edges[0].weight }: 
            // if not, create the new vertex (normal case)
            { dest: new QMDD(e0.dest.variable, edges), weight: 1 };

        QMDD.sums.set(key, sum);

        return sum;
    }

    /**
     * Multiplies two QMDDs together, pointed to by the given edges, according to
     * `10.1109/CEC.2006.1688610`. 
     * @param e0 An `Edge` pointing to the first `QMDD`.
     * @param e1 An `Edge` pointing to the second `QMDD`.
     * @returns A new `Edge` pointing to the product `QMDD`.
     */
    public static mul (e0: Edge, e1: Edge, terminal: QMDD): Edge
    {
        // can't sort here (multiplication is not commutative)
        const key = `${e0.dest.id};${e1.dest.id};${e0.weight};${e1.weight}`; 

        if (QMDD.prods.has(key)) // reuse existing products
            return { dest: QMDD.prods.get(key)!.dest, weight: QMDD.prods.get(key)!.weight };

        if (e1.dest.isTerminal())
            [e0, e1] = [e1, e0];

        if (e0.weight === 0)
            return { dest: terminal, weight: 0 };

        if (e0.dest.isTerminal())
            return { dest: e1.dest, weight: Complex.mul(e0.weight, e1.weight) };

        if (e0.dest.variable > e1.dest.variable) // if e0 precedes e1
            [e0, e1] = [e1, e0];

        for (const [id, other] of [[e0, e1], [e1, e0]]) if (id.dest.isIdentity)
            return {
                dest: other.dest,
                weight: Complex.mul(id.weight, id.dest.scalar, other.weight)
            };

        const edges: Edge[] = [];

        for (const i of [0, 2]) for (const j of [0, 1])
        {
            let e = { dest: terminal, weight: 0 };

            for (const k of [0, 1])
            {
                const e0_ik = e0.dest.edges[i + k];
                const e1_jk = e1.dest.edges[j + 2 * k];
                const p: Edge = { dest: e0_ik.dest, weight: Complex.mul(e0.dest.scalar, e0.weight, e0_ik.weight) };
                const q: Edge = e0.dest.variable === e1.dest.variable ?
                    { dest: e1_jk.dest, weight: Complex.mul(e1.dest.scalar, e1.weight, e1_jk.weight) }:
                    { dest: e1.dest, weight: e1.weight };
                
                const prod = QMDD.mul(p, q, terminal);
                const sum = QMDD.add(e, prod.weight === 0 ? { dest: terminal, weight: 0 }: prod, terminal);
                e = sum.weight === 0 ? { dest: terminal, weight: 0 } : sum; 
            }
            edges.push(e);
        }

        const prod = (edges.every(edge => edge.dest === edges[0].dest && edge.weight === edges[0].weight)) ?
            // if all computed edges point to the same vertex with the same weight,
            // skip this product entirely and point to the common destination
            { dest: edges[0].dest, weight: edges[0].weight } : 
            // if not, create the new vertex (normal case)
            { dest: new QMDD(e0.dest.variable, edges), weight: 1 };
        
        QMDD.prods.set(key, prod);

        return prod; 
    }

    /**
     * Builds a new `QMDD` according to the given `repr` instruction, following
     * `10.1007/978-3-319-59936-6_17`.
     * @param repr The step representation to turn into a `QMDD`.
     * @param terminal The `QMDD` to use as the global terminal.
     * @param active If `true`, the active part of the step will be created. If `false`, the inactive.
     * @returns An `Edge` pointing to the `QMDD` tree representing the given step.
     */
    public static step (repr: Gate[], terminal: QMDD, active = true): Edge
    {
        let root = terminal;
        let trivial = terminal;

        for (let i = repr.length - 1; i >= 0; i--)
        {
            const gate = repr[i];
            const edges: Edge[] = ((gate instanceof Control || active) ? 
                gate.matrix() : [1, 0, 0, 1])
                .map(amp => ({ dest: amp === 0 ? terminal : root, weight: amp }));

            if (!active && gate instanceof Control)
            {
                const [dest, weight] = trivial === root ? [terminal, 0] : [root, 1]; 
                
                edges[gate.antiactivator()] = { dest: trivial, weight: 1 };
                edges[gate.activator()] = { dest: dest, weight: weight };
            }

            const prev = root;
            root = new QMDD(i, edges);
            
            if (active) continue;
            // update the root of the identity branch 
            // to minimize verteces, if the current QMDD is equal to
            // the identity branch, use that one,
            // else create a new identity vertex pointing to the previous
            // identity branch
            if (gate instanceof Control || trivial !== prev)
                trivial = new QMDD(i, [
                    { dest: trivial,  weight: 1 },
                    { dest: terminal, weight: 0 },
                    { dest: terminal, weight: 0 },
                    { dest: trivial,  weight: 1 },
                ]);            
            else
                trivial = root;
        }

        return { dest: root, weight: 1 };
    }

    /**
     * Constructs the given `circuit` instance as a single, unified `QMDD`.
     * @param circuit The cascade of gates to turn into a `QMDD`.
     * @param depth The number of vertex layers (the number of declared qubits).
     * @returns An `Edge` pointing to the `QMDD` tree representing the given `circuit`.
     */
    public static build (circuit: Gate[][], depth: number): Edge
    {
        const terminal = new QMDD(depth);
        let entry: Edge = { dest: terminal, weight: 1 };

        for (const col of circuit)
        {
            let step = this.step(col, terminal);

            if (col.some(gate => gate instanceof Control))
                // if controls are present, create the inactive version and add them together
                step = QMDD.add(step, this.step(col, terminal, false), terminal)

            entry = QMDD.mul(entry, step, terminal);
        }

        return entry;
    }

    /**
     * Traverses the `QMDD` diagram in preorder DFS fashion, according to
     * `https://s2.smu.edu/~mitch/ftp_dir/pubs/rmw07a.pdf`. A merged technique of both
     * the implicit and the explicit schemes is used here, by assuming that the
     * initialization is already included in the QMDD and by only following the 0-path.
     * @param entry The `Edge` pointing to the root of the `QMDD`.
     * @param decimals The number of decimal places of precision to keep for the amplitudes.
     * @yields The resulting statevector in chunks of `{state, Re(amp), Im(amp)}`.
     */
    public static* evaluate (entry: Edge, decimals: number = 4): Generator<{ state: string, real: number, imag: number }>
    {
        const stack: { vertex: QMDD, state: string, weight: number }[] = [];
        // account for any initial skipped variables
        for (const vars of skipped(entry.dest.variable))
            stack.push({ vertex: entry.dest, state: vars, weight: entry.weight });

        while (stack.length > 0)
        {
            const { vertex, state, weight } = stack.pop()!;

            if (vertex.isTerminal())
            {
                const complex = Complex.get(weight)!;
                // states are assumed to be patched and weights are assumed to be nonzero due to the next loop.
                yield { 
                    state: state, 
                    real: round(complex.re(), decimals), 
                    imag: round(complex.im(), decimals)
                };
                continue;
            }
            
            // traverse all child verteces corresponding to the 0-path (edges 0, 1), nullify other edges
            // add new entries to the stack in reverse so traversal is done preorder-ly.
            for (const i of [1, 0])
            {
                const edge = vertex.edges[i];

                if (edge.weight === 0) continue;

                // push all 0-paths of this vertex (patching skipped variables along the way)
                // in reverse order so preorder can continue later
                for (const vars of skipped(edge.dest.variable - vertex.variable - 1))
                    stack.push({ 
                        vertex: edge.dest,
                        state: vars + (i === 0 ? '0' : '1') + state, 
                        weight: Complex.mul(weight, edge.weight, vertex.scalar) });                
            }
        }
    }
}