import { Complex } from "complex.js";
import { Control, Gate } from "../circuit/gates";
import { reversed, zip } from "../utils/iterators";
import { Cache } from "../utils/cache";

/**
 * A node of a QMDD, representing a selection variable.
 */
export class Vertex
{
    /**
     * The selection variable that `this` represents (the qubit index).
     */
    public readonly variable: number | undefined;

    /**
     * All 4 outgoing edges of this `Vertex`.
     */
    public readonly edges: Edge[];

    /**
     * Lookup table of already computed Vertex sums.
     */
    private static addCache = new Cache<Vertex, Vertex>();

    /**
     * Lookup table of already computed Vertex products.
     */
    private static mulCache = new Cache<Vertex, Vertex>();

    constructor (variable?: number, edges: Edge[] = [])
    {
        this.variable = variable;
        this.edges = edges;
    }

    /**
     * Boolean test to check whether `this` is the terminal `Vertex`.
     * @returns `true` if this is the terminal vertex 
     *          (all `Vertex` objects edges = [] are considered terminal verteces).
     */    
    public terminal (): boolean
    {
        return this.edges.length === 0;
    }

    /**
     * Boolean test to check whether `this.variable` is of greater index than `other.variable` and
     * thus `this` is closer to the terminal than `other`.
     * @param other A `Vertex` to compare against.
     * @returns `true` if the qubit index of `this` is greater than the qubit index of `other`
     *          (little-endian encoding, greater indeces are further down the tree).
     */
    public precedes (other: Vertex): boolean
    {
        if (this.variable === undefined)
            // if this's variable is undefined, then it is the terminal.
            // if other has a defined variable, then this precedes it, otherwise it doesnt
            return other.variable !== undefined;

        if (other.variable === undefined)
            // if other's variable is undefined, then it is the terminal.
            // either way, this cannot precede it.
            return false;

        return this.variable > other.variable
    }

    /**
     * Adds `other` to `this` by pairwise adding their `Edge` children.
     * 
     * It deviates from `DOI: 10.1109/ISMVL.2006.35` by not sinking the entry weight
     * to the children `Edge`s. This allows for more intense recycling of `Vertex` sums,
     * as now it isn't necessary to calculate an otherwise identical sum just because the
     * entry is different.
     * @param other The `Vertex` to add to `this`.
     * @returns The sum `Vertex` of `this` and `other`, a new `Vertex` object.
     */
    public add (other: Vertex): Vertex
    {
        // if this sum is already calculated, return the old result
        if (Vertex.addCache.has(this, other))
            return Vertex.addCache.get(this, other)!;

        const edges: Edge[] = [];

        for (let i = 0; i < 4; i++)
            edges.push(this.edges[i].add(other.edges[i]));
    
        // save this result to be potentially recycled
        return Vertex.addCache.set(this, other, new Vertex(this.variable, edges));
    }

    /**
     * Multiplies `this` with `other` by adding their pairwise multiplied, permuted `Edge` children.
     * 
     * It deviates from `DOI: 10.1109/ISMVL.2006.35` by not sinking the entry weight
     * to the children `Edge`s. This allows for more intense recycling of `Vertex` products,
     * as now it isn't necessary to calculate an otherwise identical product just because the
     * entry is different.
     * @param other The `Vertex` to multiply `this` with.
     * @returns The product `Vertex` of `this` and `other`, a new `Vertex` object.
     */
    public multiply (other: Vertex): Vertex
    {
        // if this product is already calculated, return the old result
        if (Vertex.mulCache.has(this, other))
            return Vertex.mulCache.get(this, other)!;

        const edges: Edge[] = [];

        // unwrapped lookup tables for the case r = 2
        const thisEdges  = [[0, 2], [1, 3], [0, 2], [1, 3]];
        const otherEdges = [[0, 1], [0, 1], [2, 3], [2, 3]];

        for (const [e0, e1] of zip(thisEdges, otherEdges))
            edges.push( 
                    this.edges[e0[0]].multiply(other.edges[e1[0]])
                .add(
                    this.edges[e0[1]].multiply(other.edges[e1[1]])))
        
        // save this result to be potentially recycled
        return Vertex.mulCache.set(this, other, new Vertex(this.variable, edges));
    }
}

/**
 * An edge of a QMDD, leading to a `Vertex` with a specified weight.
 */
export class Edge
{
    /**
     * This `Edge`'s destination.
     */
    public readonly pointsTo: Vertex;

    /**
     * This `Edge`'s weight.
     */
    public weight: Complex;

    constructor (destination: Vertex, weight: Complex)
    {
        this.pointsTo = destination;
        this.weight = weight;
    }

    /**
     * Adds two `Edge`s leading to two QMDDs to be added.
     * 
     * Follows `DOI: 10.1109/ISMVL.2006.35` up until the `Vertex` addition point.
     * @param other The `Edge` leading to the other QMDD to add to `this`.
     * @returns The `Edge` pointing to the sum QMDD.
     */
    public add (other: Edge): Edge
    {
        let e0: Edge = this, e1: Edge = other;

        if (e1.pointsTo.terminal()) 
            [e0, e1] = [e1, e0];

        if (e0.pointsTo.terminal() && e0.weight.isZero()) 
            return e1;

        if (e0.pointsTo.terminal() && e1.pointsTo.terminal()) 
            return new Edge(e0.pointsTo, e0.weight.add(e1.weight));

        if (e0.pointsTo.terminal() || e0.pointsTo.precedes(e1.pointsTo))
            /* c8 ignore next */
            [e0, e1] = [e1, e0];

        return new Edge(e0.pointsTo.add(e1.pointsTo), e0.weight.mul(e1.weight));
    }

    /**
     * Multiplies two `Edge`s pointing to two QMDDs to be multiplied together.
     * 
     * Follows `DOI: 10.1109/ISMVL.2006.35` up until the `Vertex` multiplication point.
     * @param other The `Edge` leading to the other QMDD to multiply with `this`.
     * @returns The `Edge` pointing to the product QMDD.
     */
    public multiply (other: Edge): Edge
    {
        let e0: Edge = this, e1: Edge = other;

        if (e1.pointsTo.terminal())
            [e0, e1] = [e1, e0];

        if (e0.pointsTo.terminal() && e0.weight.equals(Complex.ZERO))
            return e0;

        if (e0.pointsTo.terminal() && e0.weight.equals(Complex.ONE))
            return e1;

        if (e0.pointsTo.terminal())
            return new Edge(e1.pointsTo, e0.weight.mul(e1.weight));

        if (e0.pointsTo.precedes(e1.pointsTo))
            /* c8 ignore next */
            [e0, e1] = [e1, e0];
        
        return new Edge(e0.pointsTo.multiply(e1.pointsTo), e0.weight.mul(e1.weight));
    }
}

/**
 * A directed-acyclic graph (DAG) encoding the flow of a quantum algorithm.
 */
export class QMDD
{
    /**
     * The initial `Edge` pointing to `this`.
     */
    public readonly entry: Edge;

    /**
     * The number of `Vertex` layers inside `this` QMDD (equal to the number of defined qubits).
     */
    public readonly depth: number;

    /**
     * Maps the given circuit representation to the unified `QMDD` object.
     * @param representation The matrix of `Gate` objects defined by the user.
     */
    constructor (representation: Gate[][])
    {
        if (!Array.isArray(representation))
            throw new Error(`Invalid input type in QMDD (expected Gate[][]).`);

        // step 1: start from the initial trivial edge (weight 1, points to terminal)
        const terminal = new Vertex();
        let entry = new Edge(terminal, Complex.ONE);

        for (const step of representation)
        {
            // step 2: build active and inactive (if necessary) versions            
            let stepQMDD = this.build(step, terminal);

            if (step.some(gate => gate instanceof Control)) 
                // step 3: add them together (if necessary)
                stepQMDD = stepQMDD.add(this.build(step, terminal, false))

            // step 4: multiply the previous edge with this new edge
            entry = entry.multiply(stepQMDD);
        }

        this.entry = entry;
        this.depth = representation.at(0)?.length ?? 0;
    }

    /** 
     * Evaluates the underlying QMDD by traversing through the 0 route (follows edges 00, 01 => edge indeces 0, 1).
     * Assumes that the initialization of the circuit is included inside the graph definition as gates.
     * 
     * Follows the implicit multiplication schema of `https://s2.smu.edu/~mitch/ftp_dir/pubs/rmw07a.pdf`,
     * but it accumulates the weights of the visited `Edge`s because of the weight sinking deviation.
     * @param decimals How many decimal points of accuracy to keep in the complex number parts.
     * @yields Triples of `[basis state, real part, imaginary part]`. Zero-amplitude states are discarded to save memory.
     */
    public* evaluate (decimals: number = 4): Generator<[string, number, number]>
    {
        if (typeof decimals !== 'number' || decimals < 0 || decimals > 10 || !Number.isInteger(decimals))
            throw new Error(`Invalid input type in QMDD.evaluate (expected an integer in [0, 10], got ${decimals}).`);

        if (this.entry.pointsTo.terminal())
            throw new Error(`Cannot evaluate an empty QMDD.`);

        const stack: { vertex: Vertex, weight: Complex, state: string }[] = [];
        const pad = 10 ** decimals;
        const round = (num: number) => Math.round(num * pad) / pad;

        stack.push({ vertex: this.entry.pointsTo, weight: this.entry.weight, state: '' });

        while (stack.length > 0)
        {
            const { vertex, weight, state } = stack.pop()!;

            if (vertex.terminal())
                yield [state, round(weight.re), round(weight.im)];
            
            // always take the 0 route (initialization is included in the circuit as gates)
            // push the 01 edge <=> index 2 first so the 00 edge has priority
            else for (const i of [2, 0])
            {
                // skip 0-edges
                if (vertex.edges[i].weight.isZero())
                    continue;

                stack.push({ 
                    vertex: vertex.edges[i].pointsTo, 
                    // keep a running total of both the visited edge's weights and corresponding bits
                    weight: weight.mul(vertex.edges[i].weight),
                    state:  (i === 0 ? '0' : '1') + state});
            }
        }
    }

    /**
     * Constructs the given set as a QMDD, in the specified activation mode.
     * 
     * Follows `DOI:10.1007/978-3-319-59936-6_17`, assuming that the bottom-most inactive control
     * always points to the void.
     * @param step The `Gate` array to build into a QMDD.
     * @param terminal The `Vertex` to use as the terminal point.
     * @param active If `true`, builds the version where all controls are ON. Otherwise, builds inactive version
     *               where noncontrol gates are identities.
     * @returns The entry `Edge` of the step QMDD.
     */
    private build (step: Gate[], terminal: Vertex, active: boolean = true): Edge
    {   
        let prev = terminal;
        let identityBranch = terminal;

        for (const [i, gate] of reversed(step, true))
        {
            const edges: Edge[] = [];
            const matrix = (gate instanceof Control || active) ? gate.matrix() : [1, 0, 0, 1];

            for (const weight of matrix) 
                edges.push(new Edge(weight === 0 ? terminal : prev, Complex(weight)));

            if (!active && gate instanceof Control)
            {   
                edges[gate.antiActiveDiagonal()] = new Edge(identityBranch, Complex.ONE);

                const [dest, weight] = identityBranch === prev ? [terminal, 0] : [prev, 1]; 

                edges[gate.activeDiagonal()] = new Edge(dest, Complex(weight));
            }
            
            const prevPrev = prev
            prev = new Vertex(i, edges);

            if (active) continue;
            
            // update the root of the identity branch 
            // to minimize verteces, if the current QMDD is equal to
            // the identity branch, use that one,
            // else create a new identity vertex pointing to the previous
            // identity branch
            if (gate instanceof Control || identityBranch !== prevPrev)
                identityBranch = new Vertex(i, [
                    new Edge(identityBranch, Complex.ONE),
                    new Edge(terminal,       Complex.ZERO),
                    new Edge(terminal,       Complex.ZERO),
                    new Edge(identityBranch, Complex.ONE),
                ]);
            else
                identityBranch = prev;
        }

        return new Edge(prev, Complex.ONE);
    }
}