/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Calculates the greatest common divisor of all passed numbers
 * (assumed integers) using the Euclidean algorithm.
 * @param nums Assumed to be a sequence of integers.
 * @returns The GCD of the sequence.
 */
const gcd = (...nums: number[]) => nums.reduce((a, b) => {
    while (b) 
        [a, b] = [b, a % b];
    
    return a;
});

/**
 * A representation of a complex number with the format
 * (A + B/sqrt(2) + Cj + D/sqrt(2)) / E, where A, B, C, D, E are all integers,
 * and j is the imaginary unit.
 */
export class Complex
{
    /**
     * The rational scalar of the real part.
     */
    private readonly A: number;
    /**
     * The irrational scalar of the real part.
     */
    private readonly B: number;
    /**
     * The rational scalar of the imaginary part.
     */
    private readonly C: number;
    /**
     * The irrational scalar of the imaginary part.
     */
    private readonly D: number;
    /**
     * The global denominator.
     */
    private readonly E: number;

    /**
     * The unique identifier of the complex number.
     */
    public readonly index!: number;

    // lookup tables
    private static i2complex: Complex[] = [];
    private static complex2i = new Map<string, number>();
    private static sums      = new Map<string, number>();
    private static prods     = new Map<string, number>();
    private static quots     = new Map<string, number>();

    /**
     * Floating point value of the square root of one half.
     */
    public static readonly SQRT_ONE_HALF = Math.sqrt(0.5); 

    /**
     * The index of complex zero.
     */
    public static readonly ZERO = 0;
    /**
     * The index of complex one.
     */
    public static readonly ONE = 1;
    /**
     * The index of the complex square root of one half.
     */
    public static readonly A = 2;
    /**
     * The index of complex negative one.
     */
    public static readonly NEG_ONE = 3;
    /**
     * The index of the imaginary unit.
     */
    public static readonly I = 4;
    /**
     * The index of the negative imaginary unit.
     */
    public static readonly NEG_I = 5;
    /**
     * The index of the negative complex square root of one half.
     */
    public static readonly NEG_A = 6;
    /**
     * The index of `1/sqrt(2)+j/sqrt(2)`.
     */
    public static readonly B = 7;
    /**
     * The index of the conjugate of `Complex.B`.
     */
    public static readonly C = 8;

    constructor (a: number, b: number, c: number, d: number, e: number = 1)
    {
        if (e === 0) throw new Error('Error in Complex(): Division by zero.');

        const f = gcd(a, b, c, d, e);

        this.A = a / f;
        this.B = b / f;
        this.C = c / f;
        this.D = d / f;
        this.E = e / f;
        
        const i = Complex.complex2i.get(this.toString());

        if (i !== undefined) return Complex.i2complex[i];

        Complex.i2complex.push(this);
        Complex.complex2i.set(this.toString(), Complex.i2complex.length - 1);
        this.index = Complex.i2complex.length - 1;
    }

    /**
     * Performs complex addition between `this` and `other` using only integer arithmetic.
     * The nature of the algorithm follows immediately from the definition of the format and that
     * of complex addition, although the arithmetic is involved.
     * @param other The `Complex` number to add to `this`.
     * @returns The sum `Complex` number.
     */
    public add (other: Complex): Complex
    {
        // skip trivial calculations (adding 0)
        // if (other.index === 0) return this; /* this doesnt occur because through sorting, 0 is always the first element */
        if (this.index  === 0) return other;

        return new Complex(
            this.E * other.A + other.E * this.A,
            this.E * other.B + other.E * this.B,
            this.E * other.C + other.E * this.C,
            this.E * other.D + other.E * this.D,
            this.E * other.E
        );
    }

    /**
     * Performs complex multiplication between `this` and `other` using only integer arithmetic.
     * The nature of the algorithm follows immediately from the definition of the format and that
     * of complex multiplication, although the arithmetic is involved.
     * @param other The `Complex` number to multiply with `this`.
     * @returns The product `Complex` number.
     */
    public mul (other: Complex): Complex
    {
        // skip trivial calculations (mulitplying with 0 or 1)
        if (this.index  === 0 || other.index === 1) return this;
        if (other.index === 0 || this.index  === 1) return other;
        
        // just do the math bro lol
        return new Complex(
            2 *  this.A * other.A +     other.B * this.B  - 2 * this.C * other.C - other.D * this.D,
            2 * (this.A * other.B +     other.A * this.B  -     this.C * other.D - other.C * this.D),
            2 *  this.A * other.C + 2 * other.A * this.C  +     this.B * other.D + other.B * this.D,
            2 * (this.A * other.D +     other.A * this.D  +     this.B * other.C + other.B * this.C),
            2 *  this.E * other.E
        );
    }

    /**
     * Performs complex division between `this` and `other` using only integer arithmetic.
     * The nature of the algorithm follows immediately from the definition of the format and that
     * of complex multiplication, although the arithmetic is involved.
     * @param other The `Complex` number to divide `this` with.
     * @returns The quotient `Complex` number.
     */
    public div (other: Complex): Complex
    {
        // protect against division by zero
        if (other.index === 0) throw new Error('Error in Complex.div(): Division by zero.');
        // skip trivial calculations (numerator is 0 or denominator is 1)
        if (this.index  === 0 || other.index === 1) return this;
        // if dividing by itself, terminate early
        if (this.index === other.index) return Complex.i2complex[Complex.ONE];

        const temp1 = 2 * (other.A * other.A + other.C * other.C) + other.B * other.B + other.D * other.D;
        const temp2 = other.A * other.B + other.C * other.D;
        const temp3 = 2 * (this.A * other.A + this.C * other.C) + this.B * other.B + this.D * other.D;
        const temp4 = 2 * (this.A * other.B + this.B * other.A  + this.C * other.D + this.D * other.D);
        const temp5 = 2 * (this.C * other.A - this.A * other.C) + this.D * other.B - this.B * other.D;
        const temp6 = 2 * (this.C * other.B + this.D * other.A  - this.A * other.D - this.B * other.C);

        return new Complex(
            other.E * (temp1 * temp3 - 2 * temp2 * temp4),
            other.E * (temp1 * temp4 - 4 * temp2 * temp3),
            other.E * (temp1 * temp5 - 2 * temp2 * temp6),
            other.E * (temp1 * temp6 - 4 * temp2 * temp5),
            this.E  * (temp1 * temp1 - 8 * temp2 * temp2));
    }

    /**
     * The real part of the complex number.
     * @returns The unwrapped, floating point real part of `this`.
     */
    public re (): number
    {
        return (this.A + this.B * Complex.SQRT_ONE_HALF) / this.E;
    }

    /**
     * The imaginary part of the complex number.
     * @returns The unwrapped, floating point imaginary part of `this`.
     */
    public im (): number
    {
        return (this.C + this.D * Complex.SQRT_ONE_HALF) / this.E;
    }

    /**
     * Serializes `this` Complex number. Useful for accessing caches.
     * @returns A serialization of the format `"A;B;C;D;E"`.
     */
    public toString(): string
    {
        return `${this.A};${this.B};${this.C};${this.D};${this.E}`;
    }

    /**
     * Checks whether the given `index` corresponds to a saved `Complex`.
     * @param index The index of the sought-after `Complex`.
     * @returns `true` if the index is bound to a `Complex` object, `false` otherwise.
     */
    public static has (index: number): boolean
    {
        return Number.isInteger(index) && index >= 0 && index < Complex.i2complex.length
    }

    /**
     * Fetches the `Complex` object corresponding to the passed `index`.
     * @param index The index of the desired `Complex`.
     * @returns The `Complex` instance bound to `index`, if it exists; `undefined` otherwise.
     */
    public static get (index: number): Complex | undefined
    {
        return Complex.has(index) ? Complex.i2complex[index] : undefined;
    }

    /**
     * Adds the two underlying `Complex` numbers together, yielding the index of the result.
     * @param first The index of the first `Complex`.
     * @param second The index of the second `Complex`.
     * @returns The index of the sum `Complex`.
     */
    public static add (first: number, second: number): number
    {
        if (first > second) 
            return Complex.add(second, first); // sort the parameters so identical additions are saved once
        
        if (!Complex.has(first) || !Complex.has(second))
            throw new Error('Error in Complex.add(): Out of bounds value passed.');

        if (Complex.sums.has(`${first},${second}`))
            return Complex.sums.get(`${first},${second}`)!; // reuse saved sums

        const sum = Complex.i2complex[first].add(Complex.i2complex[second]).index; 

        Complex.sums.set(`${first},${second}`, sum);

        return sum;
    }

    /**
     * Multiplies the two underlying `Complex` numbers together, yielding the index of the result.
     * @param indeces The indeces of the `Complex` objects to multiply together.
     * @returns The index of the product `Complex`.
     */
    public static mul (...indeces: number[]): number
    {
        if (indeces.length < 1) 
            throw new Error('Error in Complex.mul(): No values passed.');

        if (indeces.some(i => !Complex.has(i)))
            throw new Error('Error in Complex.mul(): Out of bounds value passed.');

        const key = [...indeces].sort((a, b) => a - b).join(','); // sort parameters so identical multiplications are saved once

        if (Complex.prods.has(key))
            return Complex.prods.get(key)!; // reuse saved products

        let prod = Complex.i2complex[indeces[0]];
 
        for (let i = 1; i < indeces.length; i++)
            prod = prod.mul(Complex.i2complex[indeces[i]]);
 
        Complex.prods.set(key, prod.index);

        return prod.index;
    }

    /**
     * Divides the underlying `Complex` number of `numerator` by the underlying `Complex` number of `denominator`,
     * yielding the index of the result.
     * @param numerator The index of the dividend `Complex`.
     * @param denominator The index of the divisor `Complex`.
     * @returns The index of the quotient `Complex`.
     */
    public static div (numerator: number, denominator: number): number
    {
        if (!Complex.has(numerator) || !Complex.has(denominator))
            throw new Error('Error in Complex.div(): Out of bounds value passed.');

        if (Complex.quots.has(`${numerator},${denominator}`))
            return Complex.quots.get(`${numerator},${denominator}`)!; // reuse saved divisions

        const quot = Complex.i2complex[numerator].div(Complex.i2complex[denominator]).index;
 
        Complex.quots.set(`${numerator},${denominator}`, quot);

        return quot;
    }

    /**
     * Voids all caches and resets them to the starting phase (only constants).
     * 
     * Development tool.
     */
    public static reset (): void
    {
        Complex.i2complex = [];
        Complex.complex2i = new Map();
        Complex.sums  = new Map();
        Complex.prods = new Map();
        Complex.quots = new Map();

        new Complex( 0, 0, 0, 0); // 0+0j                 -> ZERO
        new Complex( 1, 0, 0, 0); // 1+0j                 -> ONE
        new Complex( 0, 1, 0, 0); // 1/sqrt(2)+0j         -> A
        new Complex(-1, 0, 0, 0); // -1+0j                -> NEG_ONE
        new Complex( 0, 0, 1, 0); // 0+1j                 -> I
        new Complex( 0, 0,-1, 0); // 0-1j                 -> NEG_I
        new Complex( 0,-1, 0, 0); // -1/sqrt(2)+0j        -> NEG_A  
        new Complex( 0, 1, 0, 1); // 1/sqrt(2)+1/sqrt(2)j -> B
        new Complex( 0, 1, 0,-1); // 1/sqrt(2)-1/sqrt(2)j -> C
    }
}

Complex.reset();