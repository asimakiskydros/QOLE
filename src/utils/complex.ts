/**
 * A complex value.
 */
export class Complex
{
    /**
     * The real part of the complex number.
     */
    public readonly real: number;
    /**
     * The imaginary part of the complex number.
     */
    public readonly imag: number;

    /**
     * Casts the given number representation to a `Complex` object.
     * @param arg The primary number representation. If a `number`, it assumes it represents the real part.
     *            If a `string`, it assumes it represents the whole complex number.
     * @param imag The imaginary part of the complex number. If `arg` is a string this argument is ignored.
     */
    constructor (arg: number | string, imag: number = 0)
    {
        if (typeof arg === 'string')
        {
            const complex = Complex.from(arg);

            if (!complex) 
                throw new Error(`Invalid Complex number format: ${arg}`);

            this.real = complex.real;
            this.imag = complex.imag;
        }
        else
        {
            this.real = arg;
            this.imag = imag;
        }
    }

    /**
     * Creates a new `Complex` instance from a given string.
     * @param representation The representation to convert to a `Complex`.
     * @returns A new `Complex` instance if `representation` is a valid complex number; `null` otherwise.
     */
    public static from (representation: string): Complex | null
    {
        // -?(float)( )*(+,-)?( )*(float)?(i, j)?
        const regex = /^(-?\d+(\.\d+)?)?\s*([\+\-])?\s*(\d+(\.\d+)?)?[ij]?$/;
        const matches = representation.match(regex);
        
        if (matches) 
        {
            const real = matches[1] ? parseFloat(matches[1]) : 0; 
            const imag = matches[4] ? parseFloat(matches[4]) : 0;
            const sign = matches[3];

            return new Complex(real, sign === '-' ? -imag : imag);
        }
        
        return null;
    }

    /**
     * Unwraps the object as a list of numbers. Real is first.
     * @returns A list of the two underlying numbers; `[real, imag]`.
     */
    public unwrap (format?: 'list'): [number, number];
    /**
     * Unwraps the object as a map.
     * @returns A map containing the two underlying numbers; `{real: real, imag: imag}`.
     */
    public unwrap (format: 'map'): { real: number, imag: number };
    public unwrap (format: 'list' | 'map' = 'list'): [number, number] | { real: number, imag: number }
    {
        if (format === 'map') return { real: this.real, imag: this.imag };

        return [this.real, this.imag];
    }

    /**
     * Returns the string representation of the Complex number instance.
     * Uses 'i' as the imaginary unit.
     * @returns The string representation of the Complex number.
     */
    public toString (): string
    {
        return `${this.real} + ${this.imag}i`;
    }

    /**
     * Checks whether the underlying complex number is equal to zero.
     * @returns `true` if `this` is `0+0i`.
     */
    public isZero (): boolean
    {
        return this.real === 0 && this.imag === 0;
    }

    /**
     * Checks whether the underlying complex number is equal one.
     * @returns `true` if `this` is `1+0i`.
     */
    public isOne (): boolean
    {
        return this.real === 1 && this.imag === 0;
    }

    /**
     * Checks whether the complex number reduces to a real one.
     * @returns `true` if the imaginary part is 0.
     */
    public isReal (): boolean
    {
        return this.imag === 0;
    }

    /**
     * Checks whether the complex number is purely imaginary.
     * @returns `true` if the real part is 0 and the imaginary is not.
     */
    public isImaginary (): boolean
    {
        return this.real === 0 && this.imag !== 0;
    }

    /**
     * Returns the conjugate of the complex number.
     * @returns A new `Complex` instance with the imaginary part flipped.
     */
    public conjugate (): Complex
    {
        return new Complex(this.real, -this.imag);
    }

    /**
     * Returns the "absolute value" of the complex number.
     * @returns The square root of `real^2 + imag^2`.
     */
    public magnitude (): number
    {
        return Math.sqrt(this.real * this.real + this.imag * this.imag);
    }

    /**
     * Adds the two values together.
     * 
     * If `other` is complex, it performs complex addition. Otherwise, it elementwise adds `other` to both parts.
     * @param other The rightmost value in the operation.
     * @returns A new `Complex` instance representing the sum.
     */
    public add (other: Complex | number): Complex
    {
        if (other instanceof Complex)
            return new Complex(this.real + other.real, this.imag + other.imag);
        else
            return new Complex(this.real + other, this.imag);
    }

    /**
     * Subtracts the given value from this one.
     * 
     * If `other` is complex, it performs complex subtraction. Otherwise, it elementwise subtracts `other` from both parts.
     * @param other The rightmost value in the operation.
     * @returns A new `Complex` instance representing the difference.
     */
    public subtract (other: Complex | number): Complex
    {
        if (other instanceof Complex)
            return new Complex(this.real - other.real, this.imag - other.imag);
        else
            return new Complex(this.real - other, this.imag);
    }

    /**
     * Multiplies the two values together.
     * 
     * If `other` is complex, it performs complex multiplication. Otherwise, it elementwise multiplies `other` to both parts.
     * @param other The rightmost value in the operation.
     * @returns A new `Complex` instance representing the product.
     */
    public multiply (other: Complex | number): Complex
    {
        if (other instanceof Complex)
            return new Complex(this.real * other.real - this.imag * other.imag, this.real * other.imag + this.imag * other.real);
        else
            return new Complex(other * this.real, other * this.imag);
    }

    /**
     * Divides the given value from this value.
     * 
     * If `other` is complex, it performs complex division. Otherwise, it elementwise divides `other` from both parts.
     * @param other The rightmost part in the operation.
     * @returns A new `Complex` instance representing the quotient.
     */
    public divide (other: Complex | number): Complex
    {
        if (other instanceof Complex)
        {
            const denominator = other.magnitude() ** 2;
            const real = this.real * other.real + this.imag * other.imag;
            const imag = this.imag * other.real - this.real * other.imag;

            return new Complex(real / denominator, imag / denominator);
        }
        else
            return new Complex(this.real / other, this.imag / other);
    }

    /**
     * Compares the two values for equality.
     * @param other The value(s) to compare against.
     * @returns `true` if: `other` is `Complex` and their parts are elementwise equal or: `other` is a `number` and `this` is real and equal to `other`
     * or: `other` contains two `number`s that are elementwise equal to `this.real` and `this.imag`.
     */
    public equals (other: Complex | number | number[]): boolean
    {
        if (other instanceof Complex)
            return this.real === other.real && this.imag === other.imag;
        else if (typeof other === 'number')
            return this.isReal() && this.real === other;
        else
            return other.length === 2 && this.real === other[0] && this.imag === other[1];
    }
}