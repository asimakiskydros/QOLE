/**
 * An operation on a qubit, be it a gate or a measurement.
 */
export class Instruction
{
    protected constructor () {} // Instruction should not be create-able by third parties

    /**
     * Unwraps the underlying building blocks of `this` as a matrix of `Instructions`.
     * @returns A matrix of the internal `Instructions`. Sub-array 0 contains controls, Sub-array 1 the rest.
     */
    public unwrap (): Instruction[][]
    {
        // the base case has 0 controls and is itself its only building block
        return [[], [this]];
    }
}

/**
 * An action that measures the state of the qubit it is on and collapses it to a basis state.
 */
export class Measurement extends Instruction {
    // all measurements are fundamentally the same, make them singletons
    private static singleton: Measurement | null = null;
    
    constructor ()
    {
        if (Measurement.singleton) 
            return Measurement.singleton;

        super();
        Measurement.singleton = this;
    }
}

/**
 * A unitary transformation of a qubit's state.
 */
export class Gate extends Instruction
{
    protected constructor () { super(); } // Gate should not be create-able by third parties

    /**
     * Returns the unitary matrix of the `Gate` as a flattened array: `[top left, bottom left, top right, bottom right]`.
     */
    public matrix (): (number | string)[] 
    { 
        throw new Error(`${this.constructor.name} class doesn\'t implement matrix().`); 
    }
    
    /**
     * Creates a new `Gate` that is a controlled version of `this` gate.
     * @param numControls The number of controls to apply to this new `Gate`.
     * @param targets The number of targets - the body of `this`.
     * @param ctrlState The control state to activate on.
     * @returns A `BaseControlledGate` representing `this`, controlled as specified.
     */
    public control (numControls: number, ctrlState?: string | number): ControlledGate
    {
        // call the constructor of the caller to create a copy
        const body = new (this.constructor() as { new (): Gate })();
        let _numControls = numControls;
        let _ctrlState = ctrlState || 2 ** numControls - 1;
        let targets = [body];

        if (body instanceof BaseControlledGate) 
        {
            // dissect `body` into controls and targets and merge them with the new extra
            // controls/targets
            const ingredients = body.unwrap();
            
            targets = [...ingredients[1]] as Gate[]; // controls stay the same
            _numControls += ingredients[0].length;   // number of controls is old + new
            _ctrlState = body.controlState + (       // append the new control state to the old one. If the new is wrong, it will proc errors later.
                typeof _ctrlState === 'string' ? 
                    _ctrlState : 
                    _ctrlState.toString(2).padStart(numControls, '0'));
        }

        return new BaseControlledGate(_numControls, targets, _ctrlState);
    }
}

/**
 * A restriction on the activation of another `Gate`.
 */
export class Control extends Gate
{
    /**
     * Singleton for the case where `Control` satisfies on state |0>.
     */
    private static zeroSingleton: Control | null = null;
    /**
     * Singleton for the case where `Control` satisfies on state |1>.
     */
    private static oneSingleton:  Control | null = null;
    
    constructor (activateOnZero: boolean = false) 
    {
        if (activateOnZero && Control.zeroSingleton)
            return Control.zeroSingleton;

        if (!activateOnZero && Control.oneSingleton)
            return Control.oneSingleton;
        
        super();

        if (activateOnZero)
            Control.zeroSingleton = this;
        else
            Control.oneSingleton = this;
    }

    public override matrix (): (number | string)[]
    { 
        return this === Control.zeroSingleton ? [1, 0, 0, 0] : [0, 0, 0, 1];
    }

    /**
     * Returns the index of the diagonal matrix element that hosts the activation value.
     */
    public activeDiagonal (): number
    { 
        return this === Control.zeroSingleton ? 0 : 3; 
    }

    /**
     * Returns the index of the diagonal matrix element that doesn't host the activation value.
     */
    public antiActiveDiagonal (): number
    {
        return this === Control.zeroSingleton ? 3 : 0;
    }
}

/**
 * A `Gate` that has `Controls` conditioning its activation.
 */
export class ControlledGate extends Gate
{
    protected constructor () { super(); } // ControlledGate should not be create-able by third parties
}

/**
 * Implementation of `ControlledGate`. 
 * 
 * Done like this so that all controlled gates can be typehinted as a `ControlledGate`,
 * but `ControlledGate` itself not be create-able.
 */
class BaseControlledGate extends ControlledGate
{
    public readonly controlState: string;
    public readonly targets: Gate[];

    constructor (numControls: number, targets: Gate[], ctrlState: string | number)
    {
        if (numControls < 1 || !Number.isInteger(numControls))
            throw new Error(`Cannot declare ${numControls} number of controls.`);
        
        if (ctrlState && typeof ctrlState === 'string')
            for (const bit of ctrlState)
                if (bit !== '0' && bit !== '1')
                    throw new Error(`Unexpected control state encountered (got ${bit}).`);
        
        if (ctrlState && typeof ctrlState === 'string' && ctrlState.length !== numControls)
            throw new Error(
                `Specified control state isn't applicable to the declared number of controls 
                (got ${numControls} controls and state '${ctrlState}').`);
        
        if (ctrlState && typeof ctrlState === 'number' && ctrlState < 0 || !Number.isInteger(ctrlState))
            throw new Error(`Can't declare a control state that satisfies on ${ctrlState}.`);

        if (ctrlState && typeof ctrlState === 'number' && ctrlState.toString(2).length > numControls)
            throw new Error(
                `Specified control state isn't applicable to the declared number of controls 
                (got ${numControls} controls and state ${ctrlState} = '${ctrlState.toString(2)}').`);
        
        super();
        this.targets = [...targets];
        this.controlState = typeof ctrlState === 'string' ? ctrlState : ctrlState.toString(2).padStart(numControls, '0');
    }

    public override unwrap (): Instruction[][]
    {
        const controls: Control[] = [];

        for (const state of this.controlState)
            controls.push(new Control(state === '0'));

        return [controls, this.targets];
    }
}

/**
 * A `Gate` that leaves the qubit state as is.
 */
export class InertiaGate extends Gate
{
    // All inertias are fundamentally the same, make them singletons.
    private static singleton: InertiaGate | null = null;

    constructor ()
    {
        if (InertiaGate.singleton)
            return InertiaGate.singleton;

        super();
        InertiaGate.singleton = this;
    }

    public override matrix (): (number | string)[] { return [1, 0, 0, 1]; }
}

/**
 * The NOT gate. A `Gate` that flips the qubit state.
 */
export class XGate extends Gate
{
    // All NOTs are fundamentally the same, make them singletons.
    private static singleton: XGate | null = null;

    constructor ()
    {
        if (XGate.singleton)
            return XGate.singleton;

        super();
        XGate.singleton = this;
    }

    public override matrix (): (number | string)[] { return [0, 1, 1, 0]; }
}

/**
 * A pi radians flip along the y-axis on the Bloch sphere.
 */
export class YGate extends Gate
{
    // all Y gates are fundamentally the same, make them singletons.
    private static singleton: YGate | null = null;

    constructor ()
    {
        if (YGate.singleton)
            return YGate.singleton;

        super();
        YGate.singleton = this;
    }

    public override matrix (): (number | string)[] { return [0, '-i', 'i', 0]; }
}

/**
 * A phase flip on the qubit state.
 */
export class ZGate extends Gate
{
    // all Z gates are fundamentally the same, make them singletons.
    private static singleton: ZGate | null = null;

    constructor ()
    {
        if (ZGate.singleton)
            return ZGate.singleton;

        super();
        ZGate.singleton = this;
    }

    public override matrix (): (number | string)[] { return [1, 0, 0, -1]; }
}

/**
 * The Hadamard gate. A mapping to and from maximal superposition.
 */
export class HGate extends Gate
{
    // all Hadamards are fundamentally the same, make them singletons.
    private static singleton: HGate | null = null;

    constructor ()
    {
        if (HGate.singleton)
            return HGate.singleton;

        super();
        HGate.singleton = this;
    }

    public override matrix (): (number | string)[] 
    { 
        const sqrtOneHalf = Math.sqrt(0.5);    
        return [sqrtOneHalf, sqrtOneHalf, sqrtOneHalf, -sqrtOneHalf]; 
    }
}

/**
 * A quarter turn around the z-axis on the Bloch sphere.
 */
export class SGate extends Gate
{
    // all S gates are fundamentally the same, make them singletons.
    private static singleton: SGate | null = null;

    constructor ()
    {
        if (SGate.singleton)
            return SGate.singleton;

        super();
        SGate.singleton = this;
    }

    public override matrix (): (number | string)[] { return [1, 0, 0, 'i']; }
}

/**
 * The CNOT (or Feynman) gate. A controlled version of NOT.
 */
export class CXGate extends BaseControlledGate
{
    constructor (ctrlState: string | number = '1')
    {
        super(1, [new XGate()], ctrlState);
    }
}

/**
 * The CCNOT (or Toffoli) gate. A controlled version of CNOT.
 */
export class CCXGate extends BaseControlledGate
{
    constructor (ctrlState: string | number = '11')
    {
        super(2, [new XGate()], ctrlState);
    }
}

/**
 * The generalized Toffoli gate. A NOT with m controls.
 */
export class MCXGate extends BaseControlledGate
{
    constructor (numControls: number, ctrlState?: string | number)
    {
        super(numControls, [new XGate()], ctrlState || 2 ** numControls - 1);
    }
}

/**
 * A controlled version of Pauli Y.
 */
export class CYGate extends BaseControlledGate
{
    constructor (ctrlState: string | number = '1')
    {
        super(1, [new YGate()], ctrlState);
    }
}

/**
 * The controlled-phase gate. A controlled version of Pauli Z.
 */
export class CZGate extends BaseControlledGate
{
    constructor (ctrlState: string | number = '1')
    {
        super(1, [new ZGate()], ctrlState);
    }
}

/**
 * A controlled version of CZ.
 */
export class CCZGate extends BaseControlledGate
{
    constructor (ctrlState: string | number = '1')
    {
        super(2, [new ZGate()], ctrlState);
    }
}

/**
 * A controlled version of Hadamard.
 */
export class CHGate extends BaseControlledGate
{
    constructor (ctrlState: string | number = '1')
    {
        super(1, [new HGate()], ctrlState);
    }
}

/**
 * A controlled version of S.
 */
export class CSGate extends BaseControlledGate
{
    constructor (ctrlState: string | number = '1')
    {
        super(1, [new SGate()], ctrlState);
    }
}

// ... 
