/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Complex } from "./complex";

/**
 * A unitary transformation of a qubit's state.
 */
export class Gate
{
    protected constructor () {} // Gate should not be create-able by third parties

    /**
     * Returns the unitary matrix of the `Gate` as a flattened array: `[top left, bottom left, top right, bottom right]`.
     */
    public matrix (): number[] 
    { 
        throw new Error(`${this.constructor.name} class doesn\'t implement matrix().`); 
    }

    /**
     * Unwraps the underlying building blocks of `this` as a matrix of `Gate`s.
     * @returns A matrix of the internal `Gate`s. Sub-array 0 contains controls, Sub-array 1 the rest.
     */
    public unwrap (): Gate[][]
    {
        // the base case has 0 controls and is itself its only building block
        return [[], [this]];
    }
    
    /**
     * Creates a new `Gate` that is a controlled version of `this` gate.
     * @param numControls The number of controls to apply to this new `Gate`.
     * @param ctrlState The control state to activate on.
     * @returns A `BaseControlledGate` representing `this`, controlled as specified.
     */
    public control (numControls: number, ctrlState?: string | number): ControlledGate
    {    
        const [prevControls, targets] = this.unwrap();
        const prevCtrlState = this instanceof ControlledGate ? this.controlState : '';
        const newCtrlState = 
            ctrlState === undefined ? 
                (2 ** numControls - 1).toString(2):
            typeof ctrlState === 'number' ? 
                ctrlState.toString(2).padStart(numControls, '0'):
                ctrlState;
        
        return new ControlledGate(prevCtrlState.length + numControls, targets as Gate[], prevCtrlState + newCtrlState)
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

    public override matrix (): number[]
    { 
        return this === Control.zeroSingleton ? [1, 0, 0, 0] : [0, 0, 0, 1];
    }

    /**
     * Returns the index of the diagonal matrix element that hosts the activation value.
     */
    public activator (): number
    { 
        return this === Control.zeroSingleton ? 0 : 3; 
    }

    /**
     * Returns the index of the diagonal matrix element that doesn't host the activation value.
     */
    public antiactivator (): number
    {
        return this === Control.zeroSingleton ? 3 : 0;
    }
}

/**
 * A `Gate` that has `Controls` conditioning its activation.
 */
export class ControlledGate extends Gate
{
    public readonly controlState: string;
    public readonly targets: Gate[];

    constructor (numControls: number, targets: Gate[], ctrlState: string | number)
    {
        if (!Array.isArray(targets) || targets.some(element => !(element instanceof Gate)))
            /* c8 ignore next */
            throw new Error(`Wrong target type in ControlledGate (targets must be an array of Gates).`);

        if (ctrlState !== undefined && typeof ctrlState !== 'string' && typeof ctrlState !== 'number')
            throw new Error(
                `Invalid input type for ctrlState in ControlledGate` + 
                ` (expected {string, number, undefined}, got ${typeof ctrlState}).`);

        if (typeof numControls !== 'number' || numControls < 0 || !Number.isInteger(numControls))
            throw new Error(`Cannot declare a ControlledGate with ${numControls} number of controls.`);
        
        if (ctrlState !== undefined && typeof ctrlState === 'string')
            for (const bit of ctrlState)
                if (bit !== '0' && bit !== '1')
                    throw new Error(`Unexpected control state encountered in ControlledGate (got ${bit}).`);
        
        if (ctrlState !== undefined && typeof ctrlState === 'string' && ctrlState.length !== numControls)
            throw new Error(
                `Specified control state in ControlledGate isn't applicable to the declared number of controls` + 
                ` (got ${numControls} controls and state '${ctrlState}').`);
        
        if (ctrlState !== undefined && typeof ctrlState === 'number' && (ctrlState < 0 || !Number.isInteger(ctrlState)))
            throw new Error(`Can't declare a ControlledGate that satisfies on ${ctrlState}.`);

        if (ctrlState !== undefined && typeof ctrlState === 'number' && numControls > 0 && ctrlState.toString(2).length > numControls)
            throw new Error(
                `Specified control state in ControlledGate isn't applicable to the declared number of controls` + 
                ` (got ${numControls} controls and state ${ctrlState} = '${ctrlState.toString(2)}').`);
        
        super();
        this.targets = [...targets];
        this.controlState = 
            numControls === 0 ? '' :
            typeof ctrlState === 'string' ? ctrlState : ctrlState.toString(2).padStart(numControls, '0');
    }

    public override unwrap (): Gate[][]
    {
        const controls: Control[] = [];

        for (let i = this.controlState.length - 1; i >= 0; i--)
            controls.push(new Control(this.controlState[i] === '0'))

        return [controls, this.targets];
    }
}

/**
 * A `Gate` that leaves the qubit state as is.
 */
export class I extends Gate
{
    // All inertias are fundamentally the same, make them singletons.
    private static singleton: I | null = null;

    constructor ()
    {
        if (I.singleton)
            return I.singleton;

        super();
        I.singleton = this;
    }

    public override matrix (): number[] { return [1, 0, 0, 1]; }
}

/**
 * The NOT gate. A `Gate` that flips the qubit state.
 */
export class X extends Gate
{
    // All NOTs are fundamentally the same, make them singletons.
    private static singleton: X | null = null;

    constructor ()
    {
        if (X.singleton)
            return X.singleton;

        super();
        X.singleton = this;
    }

    public override matrix (): number[] { return [0, 1, 1, 0]; }
}

/**
 * A pi radians flip along the y-axis on the Bloch sphere.
 */
export class Y extends Gate
{
    // all Y gates are fundamentally the same, make them singletons.
    private static singleton: Y | null = null;

    constructor ()
    {
        if (Y.singleton)
            return Y.singleton;

        super();
        Y.singleton = this;
    }

    public override matrix (): number[] { return [0, Complex.I, Complex.NEG_I, 0]; }
}

/**
 * A phase flip on the qubit state.
 */
export class Z extends Gate
{
    // all Z gates are fundamentally the same, make them singletons.
    private static singleton: Z | null = null;

    constructor ()
    {
        if (Z.singleton)
            return Z.singleton;

        super();
        Z.singleton = this;
    }

    public override matrix (): number[] { return [1, 0, 0, Complex.NEG_ONE]; }
}

/**
 * The Hadamard gate. A mapping to and from maximal superposition.
 */
export class H extends Gate
{
    // all Hadamards are fundamentally the same, make them singletons.
    private static singleton: H | null = null;

    constructor ()
    {
        if (H.singleton)
            return H.singleton;

        super();
        H.singleton = this;
    }

    public override matrix (): number[] 
    { 
        return [Complex.A, Complex.A, Complex.A, Complex.NEG_A]; 
    }
}

/**
 * A quarter turn around the z-axis on the Bloch sphere.
 */
export class S extends Gate
{
    // all S gates are fundamentally the same, make them singletons.
    private static singleton: S | null = null;

    constructor ()
    {
        if (S.singleton)
            return S.singleton;

        super();
        S.singleton = this;
    }

    public override matrix (): number[] { return [1, 0, 0, Complex.I]; }
}

/**
 * The conjugate transpose (dagger) of `S`.
 */
export class Sdag extends Gate
{
    // all Sdag gates are fundamentally the same, make them singletons.
    private static singleton: Sdag | null = null;

    constructor ()
    {
        if (Sdag.singleton)
            return Sdag.singleton;

        super();
        Sdag.singleton = this;
    }

    public override matrix (): number[] { return [1, 0, 0, Complex.NEG_I]; }
}

/**
 * An eighth turn around the z-axis on the Bloch sphere.
 */
export class T extends Gate
{
    private static singleton: T | null = null;

    constructor ()
    {
        if (T.singleton)
            return T.singleton;

        super();
        T.singleton = this;
    }

    public override matrix (): number[] { return [1, 0, 0, Complex.B]; }
}

/**
 * An eighth turn around the z-axis on the Bloch sphere.
 */
export class Tdag extends Gate
{
    private static singleton: Tdag | null = null;

    constructor ()
    {
        if (Tdag.singleton)
            return Tdag.singleton;

        super();
        Tdag.singleton = this;
    }

    public override matrix (): number[] { return [1, 0, 0, Complex.C]; }
}

/**
 * The CNOT (or Feynman) gate. A controlled version of NOT.
 */
export class CX extends ControlledGate
{
    constructor (ctrlState: string | number = '1')
    {
        super(1, [new X()], ctrlState);
    }
}

/**
 * The CCNOT (or Toffoli) gate. A controlled version of CNOT.
 */
export class CCX extends ControlledGate
{
    constructor (ctrlState: string | number = '11')
    {
        super(2, [new X()], ctrlState);
    }
}

/**
 * The generalized Toffoli gate. A NOT with m controls.
 */
export class MCX extends ControlledGate
{
    constructor (numControls: number, ctrlState?: string | number)
    {
        super(numControls, [new X()], ctrlState ?? 2 ** numControls - 1);
    }
}

/**
 * A controlled version of Pauli Y.
 */
export class CY extends ControlledGate
{
    constructor (ctrlState: string | number = '1')
    {
        super(1, [new Y()], ctrlState);
    }
}

/**
 * The controlled-phase gate. A controlled version of Pauli Z.
 */
export class CZ extends ControlledGate
{
    constructor (ctrlState: string | number = '1')
    {
        super(1, [new Z()], ctrlState);
    }
}

/**
 * A controlled version of CZ.
 */
export class CCZ extends ControlledGate
{
    constructor (ctrlState: string | number = '11')
    {
        super(2, [new Z()], ctrlState);
    }
}

/**
 * A controlled version of Hadamard.
 */
export class CH extends ControlledGate
{
    constructor (ctrlState: string | number = '1')
    {
        super(1, [new H()], ctrlState);
    }
}

/**
 * A controlled version of S.
 */
export class CS extends ControlledGate
{
    constructor (ctrlState: string | number = '1')
    {
        super(1, [new S()], ctrlState);
    }
}

/**
 * A controlled version of the dagger of S.
 */
export class CSdag extends ControlledGate
{
    constructor (ctrlState: string | number = '1')
    {
        super(1, [new Sdag()], ctrlState);
    }
}

// ... 
