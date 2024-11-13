import { zip } from "../utils/iterators";
import { QMDD } from "../execution/qmdd";
import { writeFileSync } from 'fs';
import { join } from 'path';
import { 
    Control, ControlledGate, CSGate, CXGate, CYGate, CZGate, Gate, HGate, 
    InertiaGate, Instruction, MCXGate, Measurement, SGate, XGate, YGate, 
    ZGate, CCXGate, CCZGate, CHGate } from "./gates";


export class QuantumCircuit 
{    
    /**
     * The number of qubits in this circuit.
     */
    private readonly qubits: number;
    /**
     * The internal `Instruction` matrix representing the circuit instance.
     */
    private matrix: Instruction[][];

    /**
     * Creates a fresh, empty circuit with the desired amount of qubits.
     * @param numQubits The number of qubits to define.
     */
    constructor (numQubits: number)
    {
        if (numQubits < 1 || !Number.isInteger(numQubits))
            throw new Error(`Can\'t create a circuit with ${numQubits} qubits.`);

        this.qubits = numQubits;
        this.matrix = [this.getEmptyStep()];
    }

    /**
     * Builds and returns a step of length `this.qubits` filled with `InertiaGate` objects.
     * @returns An `Array` of `InertiaGate`s.
     */
    private getEmptyStep (): Array<InertiaGate>
    {
        const identityStep: InertiaGate[] = [];

        for (let j = 0; j < this.qubits; j++)
            identityStep.push(new InertiaGate());
        
        return identityStep;
    }

    /**
     * Checks whether the passed qubit has a measurement declared.
     * @param qubit The qubit index to check.
     * @returns `true` if there's at least one `Measurement` object on the given `qubit` index on any step.
     */
    private qubitMeasured (qubit: number): boolean
    {
        if (qubit < 0 || qubit >= this.qubits || !Number.isInteger(qubit))
            throw new Error(`Wrong qubit index passed (got ${qubit}).`);

        return this.matrix.some(step => step[qubit] instanceof Measurement);
    }

    /**
     * Returns the width of the circuit (i.e. the number of qubits).
     */
    public width (): number
    {
        return this.qubits;
    }

    /**
     * Returns the length of the circuit (i.e. the number of steps).
     * @returns 
     */
    public length (): number
    {
        const lastStepEmpty = 
            this.matrix
            .at(-1)
            ?.every(instruction => instruction instanceof InertiaGate);
            
        // dont count the last step if it is empty       
        return this.matrix.length - (lastStepEmpty ? 1 : 0);
    }

    /**
     * Includes the passed `instruction` on the specified qubit indeces.
     * @param instruction The `Intruction` object to include in the circuit matrix.
     * @param qubits The stream of 0-based qubit indeces to place each element of `instruction` on.
     * @returns `this` circuit instance.
     */
    public append (instruction: Instruction, qubits: number[]): QuantumCircuit
    {
        const instructionElements = instruction.unwrap().flat();

        for (const qubit of qubits)
            if (!Number.isInteger(qubit))
                throw new Error(`Qubit positions must be integers (got ${qubit}).`);
            else if (qubit < 0 || qubit >= this.qubits)
                throw new RangeError(`Qubit position specified exceeds the defined qubit range (expected [0, ${this.qubits}), got ${qubit}).`);
            else if (instructionElements.length !== qubits.length)
                throw new Error(
                    `Specified Instruction is incompatible with the desired index stream 
                    (Instruction affects ${instructionElements.length} qubits and the specified indeces are ${qubits.length}).`);

        if (instruction instanceof InertiaGate) return this;

        for (const [i, element] of zip(qubits, instructionElements))
            if (
                // if the desired place in the last step is occupied
                !(this.matrix.at(-1)?.at(i) instanceof InertiaGate) || 
                // or, if not, this element is a controlled gate
                element instanceof ControlledGate ||
                // or, if not, the last step contains controls
                this.matrix.at(-1)?.some(entity => entity instanceof Control) || 
                // or, if not, this element is a measurement and the previous step doesn't only contain measurements
                element instanceof Measurement && this.matrix.at(-1)?.some(entity => !(entity instanceof Measurement)))
            {
                this.matrix.push(this.getEmptyStep());
                break;
            }
            
        for (const [i, element] of zip(qubits, instructionElements))
            if (instruction instanceof ControlledGate || instruction instanceof Measurement)
                // place the instruction at the final step, it is ensured to be compatible by the previous loop
                this.matrix.at(-1)![i] = element;
            else
                // find the earliest step, checking starting from the last one, that each element can 'sink' to for their corresponding index
                for (let j = this.matrix.length - 1; j >= 0; j--)
                    if (!(this.matrix.at(j)?.at(i) instanceof InertiaGate))
                    {
                        this.matrix.at(j + 1)![i] = element;
                        break;
                    }

        return this;
    }

    /**
     * Initializes the circuit instance to the given initial state. By default, initialization happens
     * at the end of the current circuit. Since initialization is an operation, multiple initializations
     * can happen on the same instance.
     * @param initialState The state to initialize the circuit onto.
     * @param front If `true`, initialization will happen at the front of the circuit instance instead. Note
     *              that this is generally more expensive and if the initial state is known beforehand,
     *              initialization should happen before adding any more gates.
     * @returns `this` circuit instance.
     */
    public initialize (initialState: string, front: boolean = false): QuantumCircuit
    {
        const stateHandler: Record<string, () => Gate[]> = 
        {
            '0': () => [new InertiaGate()],                     // |0>:  Change nothing 
            '1': () => [new XGate()],                           // |1>:  X
            '+': () => [new HGate()],                           // |+>:  H
            '-': () => [new XGate(), new HGate()],              // |->:  XH
            'r': () => [new HGate(), new SGate()],              // |+i>: HS
            'l': () => [new HGate(), new SGate(), new XGate()]  // |-i>: HSX
        };
    
        for (const state of initialState)
            if (!stateHandler.hasOwnProperty(state))
                throw new Error(`Unexpected qubit initial state specified (got '${state}', expected '0'/'1'/'+'/'-'/'r'/'l').`);
        
        const prevMatrix = this.matrix;
        // if initializing at the front, wipe the current matrix (copy kept in memory)
        if (front) this.matrix = [];
        
        // apply the initialization at the end of the matrix
        for (const [i, state] of initialState.split('').entries())
            for (const gate of stateHandler[state]())
                this.append(gate, [i]);

        // if initialized at the front, reapply the old matrix
        if (front)
            for (const step of prevMatrix)
                for (const [i, gate] of step.entries())
                    this.append(gate, [i]);

        return this;
    }

    /**
     * Calculates and returns the statevector of the current circuit instance.
     * @param as `'generator'`. The statevector is returned as a lazy `Generator` iterable.
     */
    public statevector (as?: 'generator'): Generator<[string, number, number]>;
    /**
     * Calculates and returns the statevector of the current circuit instance.
     * @param as `'record'`. The statevector is compiled into a `Record` of states to amplitudes.
     * 
     *           **WARNING!** Forcing the compilation of the entire statevector in memory at runtime can cause
     *           crashes for larger circuit widths.
     */
    public statevector (as: 'record'): Record<string, { real: number, imag: number }>;
    /**
     * Calculates and returns the statevector of the current circuit instance.
     * @param filename The name of the file to store the statevector on. If such a file already exists it will be overriden.
     * @param decimals How many decimal points of accuracy to keep for the complex number parts.
     */
    public statevector (filename: string, decimals?: number): void;
    public statevector (
        as: 'generator' | 'record' | string = 'generator', 
        decimals: number = 4
        ):  Generator<[string, number, number]> | 
            Record<string, { real: number, imag: number }> | 
            void
    {
        if (as !== 'generator' && as !== 'record' && decimals < 0 || !Number.isInteger(decimals))
            throw new Error(`Can't round to ${decimals} decimal places.`);

        if (as !== 'generator' && as !== 'record' && !/^[a-zA-Z0-9-_]+$/.test(as))
            throw new Error(`Invalid given filename: ${as}.`);

        // discard the last step if it contains measurements
        const matrix = this.matrix.at(-1)?.some(instruction => instruction instanceof Measurement) ? this.matrix.slice(0, -1) : this.matrix;
        const statevectorGen = new QMDD(matrix).evaluate(true);

        switch (as)
        {
            case 'generator':
                // keep the output as a lazy iterable
                return statevectorGen;

            case 'record':
                // compile the generator into a record object
                // for large numbers of qubits this might cause a memory crash
                const result: Record<string, {real: number, imag: number}> = {};

                for (const [state, real, imag] of statevectorGen)
                {
                    result[state] = {real: real, imag: imag};
                }
                return result;

            default:
                // compile the generator into a file
                const filename = join('./qole-output', as + '.txt');

                for (const [state, real, imag] of statevectorGen)
                    writeFileSync(
                        filename, 
                        `state: |${state}> amplitude: ${real.toFixed(decimals)}+${imag.toFixed(decimals)}i`
                    );
                return;
        }
    }

    /**
     * Samples and returns shot-based counts from the theoretical statevector.
     * 
     * **WARNING!** For large circuit widths this can cause memory crashes.
     * @param shots How many shots (iterations of state choosing) to do.
     * @param postselect If given, states that dont conform to all specified conditions on all qubit indeces will be discarded.
     * @returns A `Record` of states to times chosen.
     */
    public getCounts (shots: number = 1024, postselect: Record<number, '0' | '1'> = {}): Record<string, number>
    {
        if (shots < 1 || !Number.isInteger(shots))
            throw new Error(`Number of shots must be a positive integer (got ${shots}).`);

        if (!this.matrix.at(-1)?.some(instruction => instruction instanceof Measurement))
            throw new Error(`No counts for experiment ${this} (no measurements declared).`);

        for (const key of Object.keys(postselect))
        {
            const numKey = Number(key);

            if (!Number.isInteger(numKey))
                throw new Error(`Qubit indeces must be integers (got ${numKey}).`);

            if (numKey < 0 || numKey >= this.qubits)
                throw new Error(`Qubit index out of bounds (expected [0, ${this.qubits}), got ${numKey}).`);

            if (!this.qubitMeasured(numKey))
                throw new Error(`Cannot enforce postselection on a non-measured qubit (qubit at index ${numKey} has no measurements declared).`);
        }

        const probabilityVector: { state: string, prob: number}[] = [];
        // fetch statevector and turn it into a sorted probability vector-array
        for (const [state, amplitude] of Object.entries(this.statevector('record')))
            probabilityVector.push({
                state: state,
                prob: amplitude.real * amplitude.real + amplitude.imag * amplitude.imag
            });
        probabilityVector.sort((a, b) => a.prob - b.prob);

        const rawCounts: Record<string, number> = {};
        // for each shot, decide on a state randomly, increasing the probability of the others for
        // each one not selected
        for (let shot = 0; shot < shots; shot++)
        {
            const choice = Math.random();
            let cumulativeProb = 0;

            for (const { state, prob } of probabilityVector)
            {
                cumulativeProb += prob;

                if (choice < cumulativeProb)
                {
                    rawCounts[state] = (rawCounts[state] || 0) + 1;
                    break;
                }
            }
        }

        const truncatedCounts: Record<string, number> = {};
        const measurements = 
            this.matrix.at(-1)
            ?.map((instruction, i) => instruction instanceof Measurement ? this.qubits - i - 1 : -1)
            .filter(i => i !== -1);
        // reduce the states to only those qubits that have declared measurements on them
        // unify hits of states that, when truncated, are the same
        for (const [state, counts] of Object.entries(rawCounts))
        {
            let truncatedState = '';

            for (let i = 0; i < state.length; i++)
                if (measurements?.includes(i))
                    truncatedState += state[i];

            truncatedCounts[truncatedState] = (truncatedCounts[truncatedState] || 0) + counts;
        }

        // discard any states that dont conform to all postselection conditions
        for (const [qubit, condition] of Object.entries(postselect))
        {
            const i = this.qubits - Number(qubit) - 1;

            for (const state of Object.keys(truncatedCounts))
                if (state[i] !== condition)
                    delete truncatedCounts[state];
        }

        return truncatedCounts;
    }   

    /**
     * Declares a measurement on the given qubit index.
     * @param qubit The qubit index to include the gate on.
     * @returns `this` circuit instance.
     */
    public measure (qubit: number): QuantumCircuit
    {
        return this.append(new Measurement(), [qubit]);
    }

    /**
     * Declares a measurement on all declared qubits.
     * @returns `this` circuit instance.
     */
    public measureAll (): QuantumCircuit
    {
        for (let qubit = 0; qubit < this.qubits; qubit++)
            this.measure(qubit);

        return this;
    }

    /**
     * Removes all measurements from the last step of the circuit, if any exist.
     * This happens in place.
     * @returns `this` circuit instance.
     */
    public removeFinalMeasurements (): QuantumCircuit
    {
        if (this.matrix.at(-1)?.some(instruction => instruction instanceof Measurement))
            this.matrix.pop();

        return this;
    }

    /**
     * Adds a Pauli X (NOT) gate on the given qubit index.
     * @param qubit The qubit index to include the gate on.
     * @returns `this` circuit instance.
     */
    public x (qubit: number): QuantumCircuit
    {
        return this.append(new XGate(), [qubit]);
    }

    /**
     * Adds a Pauli Y gate on the given qubit index.
     * @param qubit The qubit index to include the gate on.
     * @returns `this` circuit instance.
     */
    public y (qubit: number): QuantumCircuit
    {
        return this.append(new YGate(), [qubit]);
    }

    /**
     * Adds a Pauli Z gate on the given qubit index.
     * @param qubit The qubit index to include the gate on.
     * @returns `this` circuit instance.
     */
    public z (qubit: number): QuantumCircuit
    {
        return this.append(new ZGate(), [qubit]);
    }

    /**
     * Adds a Hadamard gate on the given qubit index.
     * @param qubit The qubit index to include the gate on.
     * @returns `this` circuit instance.
     */
    public h (qubit: number): QuantumCircuit
    {
        return this.append(new HGate(), [qubit]);
    }

    /**
     * Adds an S (square root of Z) gate on the given qubit index.
     * @param qubit The qubit index to include the gate on.
     * @returns `this` circuit instance.
     */
    public s (qubit: number): QuantumCircuit
    {
        return this.append(new SGate(), [qubit]);
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
        return this.append(new CXGate(ctrlState), [control, target]);
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
        return this.append(new CCXGate(ctrlState), [control1, control2, target]);
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
        return this.append(new MCXGate(controls.length, ctrlState), [...controls, target]);
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
        return this.append(new CYGate(ctrlState), [control, target]);
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
        return this.append(new CZGate(ctrlState), [control, target]);
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
        return this.append(new CCZGate(ctrlState), [control1, control2, target]);
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
        return this.append(new CHGate(ctrlState), [control, target]);
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
        return this.append(new CSGate(ctrlState), [control, target]);
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
        const state = typeof ctrlState === 'number' ? ctrlState.toString(2) : ctrlState;

        // DOI:10.1103/PHYSREVA.53.2855
        return this
            .cx(target2, target1)  
            // if Fredkin satisfies on |B>, the internal Toffoli satisfies on |1B>
            // if B neither |0> nor |1>, pass it as is to proc errors.
            .ccx(control, target1, target2, state == '0' ? '10' : state == '1' ? '11' : state)
            .cx(target2, target1);
    }
}