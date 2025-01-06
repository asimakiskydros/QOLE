/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { QMDD } from "./qmdd";
import { 
    Control, ControlledGate, CS, CX, CY, CZ, Gate, H, 
    I, MCX, S, X, Y, Z, CCX, CCZ, CH, T } from "./gates";

/**
 * A quantum algorithm represented as a cascade of quantum logical steps.
 */
export class QuantumCircuit 
{    
    /**
     * The number of qubits in this circuit.
     */
    private readonly qubits: number;
    /**
     * The internal `Gate` matrix representing the circuit instance.
     */
    private matrix: Gate[][];

    /**
     * Creates a fresh, empty circuit with the desired amount of qubits.
     * @param numQubits The number of qubits to define.
     */
    constructor (numQubits: number)
    {        
        if (typeof numQubits !== 'number' || numQubits < 1 || !Number.isInteger(numQubits))
            throw new Error(`Can\'t create a circuit with ${numQubits} qubits.`);

        this.qubits = numQubits;
        this.matrix = [this.getEmptyStep()];
    }

    /**
     * Builds and returns a step of length `this.qubits` filled with `InertiaGate` objects.
     * @returns An `Array` of `InertiaGate`s.
     */
    private getEmptyStep (): I[]
    {
        const identityStep: I[] = [];

        for (let j = 0; j < this.qubits; j++)
            identityStep.push(new I());
        
        return identityStep;
    }

    /**
     * Returns the width of the circuit (i.e. the number of qubits).
     */
    public width (): number
    {
        return this.qubits;
    }

    /**
     * Returns the depth of the circuit (i.e. the number of steps).
     * @returns 
     */
    public depth (): number
    {
        // dont count the final step if it is empty
        const lastStepEmpty = this.matrix.at(-1)?.every(element => element instanceof I);

        return this.matrix.length - (lastStepEmpty ? 1 : 0);
    }

    /**
     * Returns the circuit's architecture as a matrix of `Gate`s,
     * where the first index corresponds to each time step and the second to each qubit.
     */
    public asGateMatrix (): Gate[][]
    {
        return this.matrix;
    }

    /**
     * Includes the passed `gate` on the specified qubit indeces.
     * @param gate The `Gate` object to include in the circuit matrix.
     * @param qubits The stream of 0-based qubit indeces to place each element of `gate` on.
     * @returns `this` circuit instance.
     */
    public append (gate: Gate, qubits: number[]): QuantumCircuit
    {
        if (!(gate instanceof Gate))
            throw new Error(`Invalid input type for gate in QuantumCircuit.append (expected a Gate, got ${typeof gate}).`);

        const instructions = gate.unwrap().flat();

        for (const qubit of qubits)
            if (typeof qubit !== 'number' || !Number.isInteger(qubit))
                throw new Error(`Invalid qubit position type in QuantumCircuit.append (expected an integer, got ${qubit}).`);
            else if (qubit < 0 || qubit >= this.qubits)
                throw new RangeError(`Qubit position specified in QuantumCircuit.append exceeds the defined qubit range (expected [0, ${this.qubits}), got ${qubit}).`);
            else if (instructions.length !== qubits.length)
                throw new Error(
                    `Specified Gate in QuantumCircuit.append is incompatible with the desired index stream` + 
                    ` (Gate affects ${instructions.length} qubits and the specified indeces are ${qubits.length}).`);

        if (this.matrix.length === 0) this.matrix.push(this.getEmptyStep());
        if (gate instanceof I) return this;
            
        const isLastStepEmpty    = () => this.matrix.at(-1)?.every(element => element instanceof I);
        const lastStepControlled = () => this.matrix.at(-1)?.some(element => element instanceof Control);
        const lastStepOccupied   = () => this.matrix.at(-1)?.some((element, i) => qubits.includes(i) && !(element instanceof I));

        if (!isLastStepEmpty() && (
            lastStepControlled() || 
            gate instanceof ControlledGate || 
            lastStepOccupied()
        ))
            this.matrix.push(this.getEmptyStep());
        
        for (let i = 0; i < qubits.length; i++)
        {
            const qubit = qubits[i], element = instructions[i];

            if (gate instanceof ControlledGate)
                // place at the last step, guaranteed to be compatible by the previous loop
                this.matrix.at(-1)![qubit] = element;
            else
            {
                let step = this.matrix.length - 1;

                for (step; step >= 0; step--)
                    // sink to the earliest step, starting from the end, that is unoccupied and uncontrolled
                    // stop looking after meeting the first controlled step
                    if (this.matrix.at(step)?.some(element => element instanceof Control) ||
                        !(this.matrix.at(step)?.at(qubit) instanceof I))
                        break;

                // the step passed just before breaking or ending the loop is the earliest compatible
                this.matrix.at(step + 1)![qubit] = element;
            }
        }
        return this;
    }

    /**
     * Initializes the circuit instance to the given initial state. By default, initialization happens
     * at the end of the current circuit. Initialization discards any previous steps.
     * @param initialState The state to initialize the circuit onto.
     * @param front If `true`, initialization will happen at the front of the circuit instance instead, and the current
     *              instance will be kept. Note that this is generally more expensive and if the initial state is known 
     *              beforehand, initialization should happen before adding any more gates.
     * @returns `this` circuit instance.
     */
    public initialize (initialState: string | number, front: boolean = false): QuantumCircuit
    {
        const stateHandler: Record<string, () => Gate[]> = 
        {
            '0': () => [new I()],                   // |0>:  Change nothing 
            '1': () => [new X()],                   // |1>:  X
            '+': () => [new H()],                   // |+>:  H
            '-': () => [new X(), new H()],          // |->:  XH
            'r': () => [new H(), new S()],          // |+i>: HS
            'l': () => [new X(), new H(), new S()]  // |-i>: XHS
        };
    
        if (typeof initialState !== 'string' && typeof initialState !== 'number')
            throw new Error(`Invalid input type for initialState in QuantumCircuit.initialize (expected {string, number}, got ${typeof initialState}).`);

        if (typeof initialState === 'number' && (initialState < 0 || !Number.isInteger(initialState)))
            throw new Error(`Invalid input type for initialState in QuantumCircuit.initialize (expected a non-negative integer, got ${initialState}).`);

        const _initialState = typeof initialState === 'string' ? initialState : initialState.toString(2).padStart(this.width(), '0');

        if (_initialState.length !== this.width())
            throw new Error(`QuantumCircuit.initialize state specifications must encompass exactly all qubits (got '${initialState}' but the qubits are ${this.width()}).`);

        for (const state of _initialState)
            if (!stateHandler.hasOwnProperty(state))
                throw new Error(`Unexpected qubit initial state specified in QuantumCircuit.initialize (got '${state}', expected '0'/'1'/'+'/'-'/'r'/'l').`);

        // keep a temporary backup of the circuit instance up until now
        const prevMatrix = this.asGateMatrix();
        // wipe the current matrix (initialization resets the register state)
        this.matrix = [];
        
        // apply the initialization
        for (const [i, state] of _initialState.split('').entries())
            for (const gate of stateHandler[state]())
                this.append(gate, [this.qubits - i - 1]);

        // if initializing at the front, reapply the old matrix
        if (front)
            for (const step of prevMatrix)
                for (const [i, gate] of step.entries())
                    this.append(gate, [i]);

        return this;
    }
    
    /**
     * Calculates and returns the statevector of the current circuit instance.
     * The output is returned as a lazy `Generator` iterable.
     * @param decimals The number of decimal places of precision to keep for the complex number parts.
     * @returns The lazy `Generator` implementing the final statevector.
     */
    public statevector (decimals: number = 4):  Generator<{ state: string, real: number, imag: number }>
    {
        if (typeof decimals !== 'number' || decimals < 0 || !Number.isInteger(decimals))
            throw new Error(`Invalid input in QuantumCircuit.statevector: Can't round to ${decimals} decimal places.`);

        return QMDD.evaluate(QMDD.build(this.matrix, this.qubits), decimals);
    }

    /**
     * Adds a Pauli X (NOT) gate on the given qubit index.
     * @param qubit The qubit index to include the gate on.
     * @returns `this` circuit instance.
     */
    public x (qubit: number): QuantumCircuit
    {
        return this.append(new X(), [qubit]);
    }

    /**
     * Adds a Pauli X (NOT) gate on the given qubit index.
     * @param qubit The qubit index to include the gate on.
     * @returns `this` circuit instance.
     */
    public not (qubit: number): QuantumCircuit
    {
        return this.x(qubit);
    }

    /**
     * Adds a Pauli Y gate on the given qubit index.
     * @param qubit The qubit index to include the gate on.
     * @returns `this` circuit instance.
     */
    public y (qubit: number): QuantumCircuit
    {
        return this.append(new Y(), [qubit]);
    }

    /**
     * Adds a Pauli Z gate on the given qubit index.
     * @param qubit The qubit index to include the gate on.
     * @returns `this` circuit instance.
     */
    public z (qubit: number): QuantumCircuit
    {
        return this.append(new Z(), [qubit]);
    }

    /**
     * Adds a Hadamard gate on the given qubit index.
     * @param qubit The qubit index to include the gate on.
     * @returns `this` circuit instance.
     */
    public h (qubit: number): QuantumCircuit
    {
        return this.append(new H(), [qubit]);
    }

    /**
     * Adds an S (square root of Z) gate on the given qubit index.
     * @param qubit The qubit index to include the gate on.
     * @returns `this` circuit instance.
     */
    public s (qubit: number): QuantumCircuit
    {
        return this.append(new S(), [qubit]);
    }

    /**
     * Adds a T (fourth root of Z) gate on the given qubit index.
     * @param qubit The qubit inddex to include the gate on.
     * @returns `this` circuit instance.
     */
    public t (qubit: number): QuantumCircuit
    {
        return this.append(new T(), [qubit]);
    }

    /**
     * Adds a controlled-X (CNOT) gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public cx (control: number, target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.append(new CX(ctrlState), [control, target]);
    }

    /**
     * Adds a controlled-X (CNOT) gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public cnot (control: number, target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.cx(control, target, ctrlState);
    }

    /**
     * Adds a controlled-X (CNOT) gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public feynman (control: number, target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.cx(control, target, ctrlState);
    }

    /**
     * Adds a controlled-controlled-X (CCNOT/Toffoli) gate on the given qubit indeces.
     * @param control1 The index of the first control qubit.
     * @param control2 The index of the second control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public ccx (control1: number, control2: number, target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.append(new CCX(ctrlState), [control1, control2, target]);
    }

    /**
     * Adds a controlled-controlled-X (CCNOT/Toffoli) gate on the given qubit indeces.
     * @param control1 The index of the first control qubit.
     * @param control2 The index of the second control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public ccnot (control1: number, control2: number, target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.ccx(control1, control2, target, ctrlState);
    }

    /**
     * Adds a controlled-controlled-X (CCNOT/Toffoli) gate on the given qubit indeces.
     * @param control1 The index of the first control qubit.
     * @param control2 The index of the second control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public toffoli (control1: number, control2: number, target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.ccx(control1, control2, target, ctrlState);
    }

    /**
     * Adds a multi-controlled-X gate on the given qubit indeces.
     * @param controls The array of indeces of the control qubits.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public mcx (controls: number[], target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.append(new MCX(controls.length, ctrlState), [...controls, target]);
    }

    /**
     * Adds a multi-controlled-X gate on the given qubit indeces.
     * @param controls The array of indeces of the control qubits.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public mcnot (controls: number[], target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.mcx(controls, target, ctrlState);
    }

    /**
     * Adds a controlled-Y gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public cy (control: number, target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.append(new CY(ctrlState), [control, target]);
    }

    /**
     * Adds a controlled-Z gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public cz (control: number, target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.append(new CZ(ctrlState), [control, target]);
    }

    /**
     * Adds a controlled-controlled-Z gate on the given qubit indeces.
     * @param control1 The index of the first control qubit.
     * @param control2 The index of the second control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public ccz (control1: number, control2: number, target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.append(new CCZ(ctrlState), [control1, control2, target]);
    }

    /**
     * Adds a controlled-Hadamard gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public ch (control: number, target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.append(new CH(ctrlState), [control, target]);
    }

    /**
     * Adds a controlled-S gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target The index of the target qubit.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public cs (control: number, target: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.append(new CS(ctrlState), [control, target]);
    }

    /**
     * Adds a SWAP gate on the given qubit indeces.
     * @param qubit1 The index of the first qubit to swap.
     * @param qubit2 The index of the second qubit to swap.
     * @returns `this` circuit instance.
     */
    public swap (qubit1: number, qubit2: number): QuantumCircuit
    {
        return this
            .cx(qubit1, qubit2)
            .cx(qubit2, qubit1)
            .cx(qubit1, qubit2);
    }

    /**
     * Adds a controlled-SWAP (Fredkin) gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target1 The index of the first qubit to swap.
     * @param target2 The index of the second qubit to swap.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public cswap (control: number, target1: number, target2: number, ctrlState?: string | number): QuantumCircuit
    {
        const state = (ctrlState ?? '1').toString();

        // DOI:10.1103/PHYSREVA.53.2855
        return this
            .cx(target2, target1)
            // if Fredkin satisfies on |B>, the internal Toffoli satisfies on |1B>
            // if B neither |0> nor |1>, pass it as is to proc errors.
            /* c8 ignore next */
            .ccx(control, target1, target2, state === '0' ? '10' : state === '1' ? '11' : state)
            .cx(target2, target1);
    }

    /**
     * Adds a controlled-SWAP (Fredkin) gate on the given qubit indeces.
     * @param control The index of the control qubit.
     * @param target1 The index of the first qubit to swap.
     * @param target2 The index of the second qubit to swap.
     * @param ctrlState The control state to activate on.
     * @returns `this` circuit instance.
     */
    public fredkin (control: number, target1: number, target2: number, ctrlState?: string | number): QuantumCircuit
    {
        return this.cswap(control, target1, target2, ctrlState);
    }
}