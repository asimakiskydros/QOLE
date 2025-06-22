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

    public override matrix (): number[] { return [0, Complex.NEG_I, Complex.I, 0]; }
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
    /**
     * Singleton for the standard `S` case.
     */
    private static ogSingleton: S | null = null;
    /**
     * Singleton for the conjugate transpose (dagger) of `S`.
     */
    private static dagSingleton: S | null = null;

    /**
     * @param dagger if `true`, returns the conjugate transpose (dagger) of S.
     */
    constructor (dagger: boolean = false)
    {
        if (!dagger && S.ogSingleton)
            return S.ogSingleton;

        if (dagger && S.dagSingleton)
            return S.dagSingleton;

        super();

        if (dagger)
            S.dagSingleton = this;
        else
            S.ogSingleton = this;
    }

    public override matrix (): number[] { 
        return this === S.dagSingleton ? [1, 0, 0, Complex.NEG_I] : [1, 0, 0, Complex.I]; 
    }
}

/**
 * An eighth turn around the z-axis on the Bloch sphere.
 */
export class T extends Gate
{
    /**
     * Singleton for the standard `T` case.
     */
    private static ogSingleton: T | null = null;
    /**
     * Singleton for the conjugate transpose (dagger) of `T`.
     */
    private static dagSingleton: T | null = null;

    /**
     * @param dagger if `true`, returns the conjugate transpose (dagger) of T.
     */
    constructor (dagger: boolean = false)
    {
        if (!dagger && T.ogSingleton)
            return T.ogSingleton;

        if (dagger && T.dagSingleton)
            return T.dagSingleton;

        super();

        if (dagger)
            T.dagSingleton = this;
        else
            T.ogSingleton = this;
    }

    public override matrix (): number[] { 
        return this === T.dagSingleton ? [1, 0, 0, Complex.C] : [1, 0, 0, Complex.B]; 
    }
}

// ... 
