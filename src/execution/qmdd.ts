import { Complex } from "../utils/complex";
import { Control, Gate, Instruction, Measurement } from "../circuit/gates";
import { reversed, zip } from "../utils/iterators";

/**
 * A node of a QMDD, representing a selection variable.
 */
class Vertex
{
    /**
     * The selection variable that `this` represents (the qubit index).
     */
    public readonly variable: number;
    /**
     * All 4 outgoing edges of this `Vertex`.
     */
    public readonly edges: Edge[];

    constructor (variable: number = -1, edges: Edge[] = [])
    {
        this.variable = variable;
        this.edges = edges;
    }

    /**
     * Boolean test to check whether `this` is the terminal `Vertex`.
     * @returns `true` if this is the terminal vertex 
     *          (all `Vertex` objects with var == -1 or edges = [] are considered terminal verteces).
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
        return this.variable > other.variable
    }
}

/**
 * An edge of a QMDD, leading to a `Vertex` with a specified weight.
 */
class Edge
{
    /**
     * This `Edge`'s destination.
     */
    public readonly pointsTo: Vertex;
    /**
     * This `Edge`'s weight.
     */
    public readonly weight: Complex;

    constructor (destination: Vertex, weight: Complex)
    {
        this.pointsTo = destination;
        this.weight = weight;
    }

    /**
     * Adds two `Edge`s leading to two QMDDs to be added.
     * 
     * Follows 
     * `D. M. Miller and M. A. Thornton, "QMDD: A Decision Diagram Structure for Reversible and Quantum Circuits",
     *  36th International Symposium on Multiple-Valued Logic (ISMVL'06), Singapore, 2006, pp. 30-30, 
     *  doi: 10.1109/ISMVL.2006.35.`
     * @param other The `Edge` leading to the other QMDD to add to `this`.
     * @returns The `Edge` pointing to the sum QMDD.
     */
    public add (other: Edge): Edge
    {
        let _e0: Edge = this, _e1: Edge = other;

        if (_e1.pointsTo.terminal()) 
            [_e0, _e1] = [_e1, _e0];
        if (_e0.pointsTo.terminal() && _e0.weight.isZero()) 
            return _e1;
        if (_e0.pointsTo.terminal() && _e1.pointsTo.terminal()) 
            return new Edge(
                _e0.pointsTo, 
                _e0.weight.add(_e1.weight)
            );
        if (_e0.pointsTo.terminal() || _e0.pointsTo.precedes(_e1.pointsTo))
            [_e0, _e1] = [_e1, _e0];

        const edges: Edge[] = []
        
        for (const i of [0, 1, 2, 3])
        {
            const ithEdgeE0 = _e0.pointsTo.edges[i];
            const ithEdgeE1 = _e1.pointsTo.edges[i];

            edges.push(
                new Edge(ithEdgeE0.pointsTo, _e0.weight.multiply(ithEdgeE0.weight))
                .add(
                new Edge(ithEdgeE1.pointsTo, _e1.weight.multiply(ithEdgeE1.weight))
            ));
        }

        return new Edge(
            new Vertex(_e0.pointsTo.variable, edges),
            _e0.weight.multiply(_e1.weight));
    }

    /**
     * Multiplies two `Edge`s pointing to two QMDDs to be multiplied together.
     * 
     * Follows 
     * `D. M. Miller and M. A. Thornton, "QMDD: A Decision Diagram Structure for Reversible and Quantum Circuits",
     *  36th International Symposium on Multiple-Valued Logic (ISMVL'06), Singapore, 2006, pp. 30-30, 
     *  doi: 10.1109/ISMVL.2006.35.`
     * @param other The `Edge` leading to the other QMDD to multiply with `this`.
     * @returns The `Edge` pointing to the product QMDD.
     */
    public multiply (other: Edge): Edge
    {
        let _e0: Edge = this, _e1: Edge = other;

        if (_e1.pointsTo.terminal())
            [_e0, _e1] = [_e1, _e0];
        if (_e0.pointsTo.terminal() && _e0.weight.isZero())
            return _e0;
        if (_e0.pointsTo.terminal() && _e0.weight.isOne())
            return _e1;
        if (_e0.pointsTo.terminal())
            return new Edge(
                _e1.pointsTo,
                _e0.weight.multiply(_e1.weight)
            );
        if (_e0.pointsTo.precedes(_e1.pointsTo))
            [_e0, _e1] = [_e1, _e0];
        
        const edges: Edge[] = [];
        // unwrapped lookup tables for the case r = 2
        const e0picks = [
            [_e0.pointsTo.edges[0], _e0.pointsTo.edges[2]], 
            [_e0.pointsTo.edges[0], _e0.pointsTo.edges[2]],
            [_e0.pointsTo.edges[1], _e0.pointsTo.edges[3]],
            [_e0.pointsTo.edges[1], _e0.pointsTo.edges[3]]];
        const e1picks = [
            [_e1.pointsTo.edges[0], _e1.pointsTo.edges[1]], 
            [_e1.pointsTo.edges[2], _e1.pointsTo.edges[3]],
            [_e1.pointsTo.edges[0], _e1.pointsTo.edges[1]],
            [_e1.pointsTo.edges[2], _e1.pointsTo.edges[3]]]; 

        for (const [i, e0pick, e1pick] of zip(e0picks, e1picks, true))
            edges[i] = 
                    new Edge(e0pick[0].pointsTo, _e0.weight.multiply(e0pick[0].weight))
                    .multiply(
                    new Edge(e1pick[0].pointsTo, _e1.weight.multiply(e1pick[0].weight)))
                .add(
                    new Edge(e0pick[1].pointsTo, _e0.weight.multiply(e0pick[1].weight))
                    .multiply(
                    new Edge(e1pick[1].pointsTo, _e1.weight.multiply(e1pick[1].weight)))
                );
        
        return new Edge(
            new Vertex(_e0.pointsTo.variable, edges),
            _e0.weight.multiply(_e1.weight));
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
     * Maps the given circuit representation to the unified `QMDD` object.
     * @param representation The matrix of `Gate` objects defined by the user.
     */
    constructor (representation: Instruction[][])
    {
        // step 1: start from the initial trivial edge (weight 0, points to terminal)
        const terminal = new Vertex();
        let entry = new Edge(terminal, new Complex(0));

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
    }

    /**
     * Evaluates the output statevector of the underlying circuit by traversing through the diagram.
     * @param unwrapped If `true`, the generated amplitudes will be unwrapped as `[number, number]`.
     *                  Otherwise they will be returned as `Complex` objects.
     */
    public  evaluate (unwrapped:  true):  Generator<[string, number, number]>;
    public  evaluate (unwrapped?: false): Generator<[string, Complex]>;
    public* evaluate (unwrapped: boolean = false): Generator<[string, Complex] | [string, number, number]>
    {
        for (const [state, amplitude] of this._evaluate(this.entry.pointsTo, this.entry.weight, ''))
            if (unwrapped) 
                yield [state, amplitude.real, amplitude.imag];
            else 
                yield [state, amplitude];
    }

    /**
     * Traverses the underlying graph by always taking the 0 route (follows edges 00, 01 => edge indeces 0, 2),
     * by assuming that the initialization of the circuit is included inside the graph definition as gates.
     * @param root The `Vertex` to start traversing from.
     * @param weight The accumulated weight up until this point.
     * @param suffix The (partial) state constructed from the path followed up until now.
     * @yields Pairs of `[basis state, calculated amplitude]`. Zero-amplitude states are discarded to save memory.
     */
    private* _evaluate (root: Vertex, weight: Complex, suffix: string = ''): Generator<[string, Complex]>
    {
        if (root.terminal() && !weight.isZero())
        {
            yield [suffix, weight];
            return;
        }

        for (const i of [0, 2]) 
        {
            const accumulated = weight.multiply(root.edges[i].weight);
            const state = (i == 0 ? '0' : '1') + suffix;

            yield* this._evaluate(root.edges[i].pointsTo, accumulated, state);
        }
    }

    /**
     * Constructs the given set as a QMDD, in the specified activation mode.
     * @param step The `Instruction` array to build into a QMDD.
     * @param terminal The `Vertex` to use as the terminal point.
     * @param active If `true`, builds the version where all controls are ON. Otherwise, builds inactive version
     *               where noncontrol gates are identities.
     * @returns The entry `Edge` of the step QMDD.
     */
    private build (step: Instruction[], terminal: Vertex, active: boolean = true): Edge
    {   
        let prev = terminal;
        let identityBranch = terminal;

        for (const [i, instruction] of reversed(step, true))
        {
            if (instruction instanceof Measurement)
                throw new Error('Intermediate measurements not supported.');

            const edges: Edge[] = [];
            const matrix = instruction instanceof Control || active ? (instruction as Gate).matrix() : [1, 0, 0, 1];

            for (const weight of matrix) edges.push(
                new Edge(
                    weight === '0' ? terminal : prev,
                    new Complex(weight)
                ));

            if (!active && instruction instanceof Control)
            {   
                edges[instruction.antiActiveDiagonal()] = new Edge(identityBranch, new Complex(1));

                const [dest, weight] = identityBranch === prev ? [terminal, 0] : [prev, 1]; 

                edges[instruction.activeDiagonal()] = new Edge(dest, new Complex(weight));
            }
            
            const prevPrev = prev
            prev = new Vertex(i, edges);

            if (active) continue;
            
            // update the root of the identity branch 
            // to minimize verteces, if the current QMDD is equal to
            // the identity branch, use that one,
            // else create a new identity vertex pointing to the previous
            // identity branch
            if (instruction instanceof Control || identityBranch !== prevPrev)
                identityBranch = new Vertex(i, [
                    new Edge(identityBranch, new Complex(1)),
                    new Edge(terminal, new Complex(0)),
                    new Edge(terminal, new Complex(0)),
                    new Edge(identityBranch, new Complex(1)),
                ]);
            else
                identityBranch = prev;
        }

        return new Edge(prev, new Complex(1));
    }
}