/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Complex } from "./complex";

/**
 * A unitary transformation of a qubit's state.
 */
export class QuantumGate
{
    protected constructor () {} // Gate should not be create-able by third parties

    /**
     * Returns the unitary matrix of the `Gate` as a flattened array: `[top left, bottom left, top right, bottom right]`.
     */
    /* c8 ignore start */
    public matrix (): number[] 
    { 
        throw new Error(`${this.constructor.name} class doesn\'t implement matrix().`); 
    }
    /* c8 ignore end */
}
/**
 * A `Gate` that leaves the qubit state as is.
 */
export class IGate extends QuantumGate
{
    // All inertias are fundamentally the same, make them singletons.
    private static singleton: IGate | null = null;

    constructor ()
    {
        if (IGate.singleton)
            return IGate.singleton;

        super();
        IGate.singleton = this;
    }

    public override matrix (): number[] { return [1, 0, 0, 1]; }
}

/**
 * The NOT gate. A `Gate` that flips the qubit state.
 */
export class XGate extends QuantumGate
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

    public override matrix (): number[] { return [0, 1, 1, 0]; }
}

/**
 * A pi radians flip along the y-axis on the Bloch sphere.
 */
export class YGate extends QuantumGate
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

    public override matrix (): number[] { return [0, Complex.NEG_I, Complex.I, 0]; }
}

/**
 * A phase flip on the qubit state.
 */
export class ZGate extends QuantumGate
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

    public override matrix (): number[] { return [1, 0, 0, Complex.NEG_ONE]; }
}

/**
 * The Hadamard gate. A mapping to and from maximal superposition.
 */
export class HGate extends QuantumGate
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

    public override matrix (): number[] 
    { 
        return [Complex.A, Complex.A, Complex.A, Complex.NEG_A]; 
    }
}

/**
 * A quarter turn around the z-axis on the Bloch sphere.
 */
export class SGate extends QuantumGate
{
    /**
     * Singleton for the standard `S` case.
     */
    private static ogSingleton: SGate | null = null;
    /**
     * Singleton for the conjugate transpose (dagger) of `S`.
     */
    private static dagSingleton: SGate | null = null;

    /**
     * @param dagger if `true`, returns the conjugate transpose (dagger) of S.
     */
    constructor (dagger: boolean = false)
    {
        if (!dagger && SGate.ogSingleton)
            return SGate.ogSingleton;

        if (dagger && SGate.dagSingleton)
            return SGate.dagSingleton;

        super();

        if (dagger)
            SGate.dagSingleton = this;
        else
            SGate.ogSingleton = this;
    }

    public override matrix (): number[] { 
        return this === SGate.dagSingleton ? [1, 0, 0, Complex.NEG_I] : [1, 0, 0, Complex.I]; 
    }
}

/**
 * An eighth turn around the z-axis on the Bloch sphere.
 */
export class TGate extends QuantumGate
{
    /**
     * Singleton for the standard `T` case.
     */
    private static ogSingleton: TGate | null = null;
    /**
     * Singleton for the conjugate transpose (dagger) of `T`.
     */
    private static dagSingleton: TGate | null = null;

    /**
     * @param dagger if `true`, returns the conjugate transpose (dagger) of T.
     */
    constructor (dagger: boolean = false)
    {
        if (!dagger && TGate.ogSingleton)
            return TGate.ogSingleton;

        if (dagger && TGate.dagSingleton)
            return TGate.dagSingleton;

        super();

        if (dagger)
            TGate.dagSingleton = this;
        else
            TGate.ogSingleton = this;
    }

    public override matrix (): number[] { 
        return this === TGate.dagSingleton ? [1, 0, 0, Complex.C] : [1, 0, 0, Complex.B]; 
    }
}

// ... 
