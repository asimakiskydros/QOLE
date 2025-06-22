/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Gate, H, I, S, T, X, Y, Z } from "./gates";
import { VectorEdge, QMDD } from "./qmdd";

/**
 * Generates a random string of the given `length`.
 * 
 * Taken from https://stackoverflow.com/a/1349426.
 * @param length The length of the string to generate
 */
function randomString (length: number = 16) 
{
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    for (let i = 0; i < length; i++)
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    
    return result;
}

/**
 * Hashes the passed string to 4 32 bit unsigned integers.
 * 
 * Taken from https://stackoverflow.com/a/47593316.
 * @param str The string to hash.
 * @returns A list of 4 Uint32 numbers.
 */
function cyrb128 (str: string) 
{
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  
    for (let i = 0, k; i < str.length; i++) 
    {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
  
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
  
    return [h1>>>0, h2>>>0, h3>>>0, h4>>>0];
}

/**
 * Seedable pseudorandom number generator for random "collapsing" during weak simulation.
 * 
 * Taken from https://stackoverflow.com/a/47593316.
 * @params 4 Uint32 seeds.
 * @returns A PRNG function seeded on `seed`.
 */
function sfc32 (a: number, b: number, c: number, d: number): () => number
{
    return function () 
    {
        a |= 0; b |= 0; c |= 0; d |= 0;
        let t = (a + b | 0) + d | 0;
        d = d + 1 | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

/**
 * A quantum algorithm represented as a cascade of quantum logic gates.
 */
export class QuantumCircuit
{
    private readonly qubits: number; // the number of declared qubits.
    private readonly terminal: QMDD; // the global `QMDD` terminal `Vertex`.
    private diagram: VectorEdge;     // the entry `VectorEdge` of the `QMDD` diagram of `this` circuit.

    private cols: number;           // the number of gate columns in the circuit.
    private qbuckets: number[];     // qubit buckets to keep track of how many columns each qubit participates in.

    /**
     * Creates an empty circuit with the declared amount of qubits.
     * @param qubits The number of qubits to prepare.
     */
    constructor (qubits: number)
    {
        if (qubits < 1 || !Number.isInteger(qubits))
            throw new Error(`Error in QuantumCircuit(): Cannot create a circuit with ${qubits} qubits.`);

        this.qubits = qubits;
        this.terminal = QMDD.createTerminal(this.qubits);
        this.diagram = QMDD.groundState(this.terminal);

        this.cols = 0;
        this.qbuckets = Array(this.qubits).fill(0);
    }

    /**
     * Returns the width of the `QuantumCircuit` object, i.e. the number of its declared qubits.
     */
    public width (): number
    {
        return this.qubits;
    }

    /**
     * Returns the depth of the `QuantumCircuit` object, i.e. the current number of computational steps 
     * defined in the algorithm.
     */
    public depth (): number
    {
        return this.cols;
    }

    /**
     * Applies the passed `gate`, possibly controlled, on the specified qubit indices.
     * @param gate The `Gate` object describing the operation to apply on the target qubit.
     * @param target The index of the target qubit.
     * @param controls The list of the control qubit indices. `!` Assumed in the same order as `ctrlState`. 
     * @param ctrlState The control state to activate on. `!` Assumed in the same order as `controls`.
     * @returns `this` circuit instance.
     */
    public append (gate: Gate, target: number, controls: number[] = [], ctrlState: string = ""): QuantumCircuit
    {
        const temp = [target, ...controls];

        if (temp.length > this.width()) throw new Error(
            `Error in QuantumCircuit.append(): Too many qubits requested (declared width is ${this.width()} but ${temp.length} indices were received).`);

        for (const i of temp) if (i < 0 || i >= this.width()) throw new Error(
            `Error in QuantumCircuit.append(): Out of bounds qubit requested (received index ${i}, expected [0, ${this.width()})).`);

        if (new Set(temp).size < temp.length) throw new Error(
            `Error in QuantumCircuit.append(): Duplicate qubit index detected.`);

        if (controls.length > 0 && ctrlState === "")  // assume the nonspecified state is all 1-controls
            ctrlState = '1'.repeat(controls.length);

        if (controls.length !== ctrlState.length) throw new Error(
            `Error in QuantumCircuit.append(): Unequal number of controls (${controls?.length}) and control states (${ctrlState?.length}) given.`);

        if (!/^[01]*$/.test(ctrlState)) throw new Error(
            `Error in QuantumCircuit.append(): Unrecognized character found in ctrlState, '0' or '1' were expected.`);
     
        if (gate instanceof I) return this;  // skip if the passed gate is the identity

        const unified = controls.map((el, i) => ({ index: el, state: ctrlState!.at(i)! }));
        
        // create the gate as a QMDD and multiply it to the current statevector
        this.diagram = QMDD.multiply(QMDD.construct(gate, target, unified, this.terminal), this.diagram, this.terminal);
        // update step counters
        for (const i of temp) this.cols = Math.max(this.cols, ++this.qbuckets[i]);

        return this;
    }

    /**
     * Applies the specified uncontrolled step on the given qubit indices.
     * @param gates A list of `Gate` objects to apply on the target qubits. Assumed to be in the same order as `qubits`.
     * @param qubits A list of indices describing the target qubits. Assumed to be in the same order as `gates`.
     * @returns `this` circuit instance.
     */
    public appendStep (gates: Gate[], qubits: number[]): QuantumCircuit
    {
        if (gates.length !== qubits.length) throw new Error(
            `Error in QuantumCircuit.appendStep(): Unequal number of gates (${gates.length}) and qubit indices (${qubits.length}) given.`);

        if (qubits.length > this.width()) throw new Error(
            `Error in QuantumCircuit.appendStep(): Too many qubits requested (declared width is ${this.width()} but ${qubits.length} indices were received).`);

        if (new Set(qubits).size < qubits.length) throw new Error(
            'Error in QuantumCircuit.appendStep(): Duplicate qubit index detected.');

        for (const i of qubits) if (i < 0 || i >= this.width()) throw new Error(
            `Error in QuantumCircuit.appendStep(): Out of bounds qubit requested (received index ${i}, expected [0, ${this.width()})).`);

        const step = gates.map((el, i) => ({ operator: el, target: qubits[i] }));

        // create the gate as a QMDD and multiply it to the current statevector
        this.diagram = QMDD.multiply(QMDD.uncontrolledStep(step, this.terminal), this.diagram, this.terminal);
        // update step counters
        for (const i of qubits) this.cols = Math.max(this.cols, ++this.qbuckets[i]);

        return this;
    }

    /**
     * Initializes `this` to the given `state`. Previous operations are discarded.
     * @param state The initial state to apply (a combination of '0', '1', '+', '-', 'r' and 'l').
     * @returns `this` circuit instance.
     */
    public initialize (state: string): QuantumCircuit
    {
        if (state.length !== this.qubits) throw new Error(
            `Error in QuantumCircuit.initialize(): Specified state does not match the declared amount of qubits` + 
            `(${this.qubits} qubits were declared but a state of ${state.length} was given.)`);

        if (!/^[01+-rl]+$/.test(state)) throw new Error(
            `Error in QuantumCircuit.initialize(): Unrecognized character found in state, '0', '1', '+', '-', 'r' or 'l' were expected.`);

        const handler: Record<string, () => Gate[]> = 
        {
            '0': () => [new I()],                   // |0>:  Change nothing 
            '1': () => [new X()],                   // |1>:  X
            '+': () => [new H()],                   // |+>:  H
            '-': () => [new X(), new H()],          // |->:  XH
            'r': () => [new H(), new S()],          // |+i>: HS
            'l': () => [new X(), new H(), new S()]  // |-i>: XHS
        };
        // reset the diagram back to all zeros
        this.cols = 0;
        this.qbuckets = Array(this.qubits).fill(0);
        this.diagram = QMDD.groundState(this.terminal);

        for (let i = 0; i < state.length; i++)
            for (const gate of handler[state[i]]()) 
                this.append(gate, this.qubits - i - 1);  // in string notation, the first char is the MSB

        return this;
    }

    /**
     * Returns the full statevector of the current circuit instance as a lazy `Generator` iterable.
     * 
     * Read it incrementally over a loop or force it into memory at once via `[...QuantumCircuit.statevector()]`.
     * 
     * `!!!` The full statevector is exponentially large on the amount of qubits in the general case.
     * @param decimals The number of decimal places to round the complex number parts on.
     * @returns The lazy `Generator` iterable describing the statevector.
     */
    public statevector (decimals: number = 4): Generator<{ state: string, re: number, im: number }>
    {
        if (decimals < 0 || !Number.isInteger(decimals)) throw new Error(
            `Error in QuantumCircuit.statevector(): Cannot round to ${decimals} decimal places.`);
        
        return QMDD.strongSimulate(this.diagram, decimals);
    }

    /**
     * Performs shot-based sampling on the probability distribution of the current circuit instance.
     * 
     * The sampling results are returned as a map of states to occurrences. 
     * @param shots The number of sample repetitions.
     * @param seed (Optional) Seed for the pseudorandom number generation for determinism.
     * @returns A `Map` connecting each basis state to its number of occurrences in the sampling (states that did not appear are not included).
     */
    public sample (shots: number = 1024, seed?: string | number): Map<string, { occurrences: number, re: number, im: number }>
    {
        if (shots < 1 || !Number.isInteger(shots)) throw new Error(
            `Error in QuantumCircuit.sample(): Number of sample shots must be a positive integer (${shots} was passed).`);

        const [a, b, c, d] = cyrb128(seed?.toString() ?? randomString());
        const prng = sfc32(a, b, c, d);
        const counts: Map<string, { occurrences: number, re: number, im: number }> = new Map();
        
        for (let i = 0; i < shots; i++)
        {
            const [measurement, re, im] = QMDD.weakSimulate(this.diagram, this.qubits, prng);
            const prev = counts.get(measurement)?.occurrences ?? 0;
            counts.set(measurement, {
                occurrences: prev + 1,
                re: re,
                im: im
            });
        }

        return counts;
    }

    /**
     * Adds a Pauli X (NOT) gate on the given qubit indices.
     * @param qubits The qubit indices to include the gate on.
     * @returns `this` circuit instance.
     */
    public x (qubits: number | number[]): QuantumCircuit
    {
        if (typeof qubits === 'number')
            return this.append(new X(), qubits);

        // safe because X is a singleton ----------------vvvvvvv
        return this.appendStep(Array(qubits.length).fill(new X()), qubits);
    }

    /**
     * Adds a Pauli Y gate on the given qubit indices.
     * @param qubits The qubit indices to include the gate on.
     * @returns `this` circuit instance.
     */
    public y (qubits: number | number[]): QuantumCircuit
    {
        if (typeof qubits === 'number')
            return this.append(new Y(), qubits);

        // safe because Y is a singleton ----------------vvvvvvv
        return this.appendStep(Array(qubits.length).fill(new Y()), qubits);
    }

    /**
     * Adds a Pauli Z gate on the given qubit indices.
     * @param qubits The qubit indices to include the gate on.
     * @returns `this` circuit instance.
     */
    public z (qubits: number | number[]): QuantumCircuit
    {
        if (typeof qubits === 'number')
            return this.append(new Z(), qubits);

        // safe because Z is a singleton ----------------vvvvvvv
        return this.appendStep(Array(qubits.length).fill(new Z()), qubits);
    }

    /**
     * Adds a Hadamard gate on the given qubit indices.
     * @param qubits The qubit indices to include the gate on.
     * @returns `this` circuit instance.
     */
    public h (qubits: number | number[]): QuantumCircuit
    {
        if (typeof qubits === 'number')
            return this.append(new H(), qubits);

        // safe because H is a singleton ----------------vvvvvvv
        return this.appendStep(Array(qubits.length).fill(new H()), qubits);
    }

    /**
     * Adds an S (square root of Z) gate on the given qubit indices.
     * @param qubits The qubit indices to include the gate on.
     * @param dagger If `true`, instead adds the conjugate transpose (dagger) of S on `qubits`.
     * @returns `this` circuit instance.
     */
    public s (qubits: number | number[], dagger = false): QuantumCircuit
    {
        if (typeof qubits === 'number')
            return this.append(new S(dagger), qubits);

        // safe because S/Sdag is a singleton ----------------vvvvvvv
        return this.appendStep(Array(qubits.length).fill(new S(dagger)), qubits);        
    }

    /**
     * Adds a T (fourth root of Z) gate on the given qubit indices.
     * @param qubits The qubit indices to include the gate on.
     * @param dagger If `true`, instead adds the conjugate transpose (dagger) of T on `qubits`.
     * @returns `this` circuit instance.
     */
    public t (qubits: number | number[], dagger = false): QuantumCircuit
    {
        if (typeof qubits === 'number')
            return this.append(new T(dagger), qubits);

        // safe because T/Tdag is a singleton ----------------vvvvvvv
        return this.appendStep(Array(qubits.length).fill(new T(dagger)), qubits);        
    }

    /**
     * Adds a controlled-X (CNOT) gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public cx (control: number, target: number, ctrlState?: string): QuantumCircuit
    {
        return this.append(new X(), target, [control], ctrlState);
    }

    /**
     * Adds a controlled-controlled-X (CCNOT/Toffoli) gate on the given qubit indices.
     * @param first The index of the first control qubit.
     * @param second The index of the second control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public ccx (first: number, second: number, target: number, ctrlState?: string): QuantumCircuit
    {
        return this.append(new X(), target, [second, first], ctrlState);
    }

    /**
     * Adds a multi-controlled-X gate on the given qubit indices.
     * @param controls The array of the control qubit indices.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public mcx (controls: number[], target: number, ctrlState?: string): QuantumCircuit
    {
        return this.append(new X(), target, controls, ctrlState);
    }

    /**
     * Adds a controlled-Y gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public cy (control: number, target: number, ctrlState?: string): QuantumCircuit
    {
        return this.append(new Y(), target, [control], ctrlState);
    }

    /**
     * Adds a controlled-Z gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public cz (control: number, target: number, ctrlState?: string): QuantumCircuit
    {
        return this.append(new Z(), target, [control], ctrlState);
    }

    /**
     * Adds a controlled-controlled-Z gate on the given qubit indices.
     * @param first The index of the first control qubit.
     * @param second The index of the second control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public ccz (first: number, second: number, target: number, ctrlState?: string): QuantumCircuit
    {
        return this.append(new Z(), target, [second, first], ctrlState);
    }

    /**
     * Adds a controlled-Hadamard gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public ch (control: number, target: number, ctrlState?: string): QuantumCircuit
    {
        return this.append(new H(), target, [control], ctrlState);
    }

    /**
     * Adds a controlled-S gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public cs (control: number, target: number, ctrlState?: string): QuantumCircuit
    {
        return this.append(new S(), target, [control], ctrlState);
    }

    /**
     * Adds a SWAP gate on the given qubit indeces.
     * @param first The index of the first qubit to swap.
     * @param second The index of the second qubit to swap.
     * @returns `this` circuit instance.
     */
    public swap (first: number, second: number): QuantumCircuit
    {
        // lazy solution, to change.
        this
        .cx(first, second)
        .cx(second, first)
        .cx(first, second);

        // every .cx internally calls .append, iterating the relevant qubit counters thrice
        // this is probably unexpected on the user side, since this could increase the depth counter by more than 1
        // even though a single operation was requested (no matter how SWAP actually decomposes into elementaries)
        this.qbuckets[first]  -= 2;
        this.qbuckets[second] -= 2;
        this.cols = Math.max(...this.qbuckets);

        return this;
    }

    /**
     * Adds a controlled-SWAP (Fredkin) gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param first The index of the first qubit to swap.
     * @param second The index of the second qubit to swap.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public cswap (control: number, first: number, second: number, ctrlState?: string): QuantumCircuit
    {
        const state = ctrlState ?? '1';

        // DOI:10.1103/PHYSREVA.53.2855
        this
        .cx(second, first)
        // if Fredkin satisfies on |B>, the internal Toffoli satisfies on |1B>
        // if B neither |0> nor |1>, pass it as is to proc errors.
        /* c8 ignore next */
        .ccx(control, first, second, state === '0' ? '10' : state === '1' ? '11' : state)
        .cx(second, first);

        // every .cx internally calls .append, iterating the relevant qubit counters thrice
        // this is probably unexpected on the user side, since this could increase the depth counter by more than 1
        // even though a single operation was requested (no matter how SWAP actually decomposes into elementaries)
        this.qbuckets[first]  -= 2;
        this.qbuckets[second] -= 2;
        this.cols = Math.max(...this.qbuckets);

        return this;
    }
}