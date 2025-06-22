import { Complex } from "../src/complex"

describe('Complex: ', () =>
{
    test('Simple initialization', () =>
    {
        expect(new Complex(1, 2, 3, 4).toString()).toBe('1;2;3;4;1');
    });

    test('Initialization with division by zero', () =>
    {
        expect(() => { new Complex(1, 1, 1, 1, 0); })
        .toThrow('Error in Complex(): Division by zero.');
    });

    test('Initialization with multiples of 2', () =>
    {
        expect(new Complex(2, 4, 6, 8, 10).toString()).toBe('1;2;3;4;5');
    });

    test('Initialization with all negatives', () =>
    {
        expect(new Complex(-1, -2, -3, -4, -5).toString()).toBe('1;2;3;4;5');
    });

    test('Initialization with mixed signs', () =>
    {
        expect(new Complex(1, -2, 3, -4, -5).toString()).toBe('-1;2;-3;4;5');
    });

    test('Creating existing non-default value', () =>
    {
        expect(new Complex(1, 2, 3, 4).index).toBe(new Complex(2, 4, 6, 8, 2).index);
    });

    test('Verifying actual value of non-default instance', () =>
    {
        const complex = new Complex(10, 8, 2, 14, 9);

        expect(complex.re()).toBeCloseTo(1.73965047, 8);
        expect(complex.im()).toBeCloseTo(1.3221661, 7);
    });

    test('Verifying square magnitude of non-default instance', () =>
    {
        const complex = new Complex(10, 8, 2, 14, 9);
        expect(complex.mag2()).toBeCloseTo(4.77450695, 7);
    });

    test('Multiplying by the reciprocal', () =>
    {
        const complex = new Complex(1, 2, 3, 4);
        const reciprocal = Complex.div(Complex.ONE, complex.index);
        const prod = Complex.mul(complex.index, reciprocal);
        
        expect(prod).toBe(Complex.ONE);
    });

    test('Adding 0', () =>
    {
        const complex = new Complex(1, 2, 3, 4);

        expect(Complex.add(complex.index, Complex.ZERO)).toBe(complex.index);
    });

    test('Multiplying by 0', () =>
    {
        const complex = new Complex(1, 2, 3, 4);

        expect(Complex.mul(complex.index, Complex.ZERO)).toBe(Complex.ZERO);
    });

    test('Multiplying by 1', () =>
    {
        const complex = new Complex(1, 2, 3, 4);

        expect(Complex.mul(complex.index, Complex.ONE)).toBe(complex.index);
    });

    test('Dividing 0 by anything', () =>
    {
        const complex = new Complex(1, 2, 3, 4);

        expect(Complex.div(Complex.ZERO, complex.index)).toBe(Complex.ZERO);
    });

    test('Dividing by 0', () =>
    {
        expect(() => { Complex.div(Complex.B, Complex.ZERO); })
        .toThrow('Error in Complex.div(): Division by zero.');
    })

    test('Dividing anything by 1', () =>
    {
        const complex = new Complex(1, 2, 3, 4);
        
        expect(Complex.div(complex.index, Complex.ONE)).toBe(complex.index);
    });

    test('Commutativity in addition', () =>
    {
        expect(Complex.add(Complex.A, Complex.ONE)).toBe(Complex.add(Complex.ONE, Complex.A));
    });

    test('Commutativity in multiplication', () =>
    {
        expect(Complex.mul(Complex.NEG_I, Complex.B)).toBe(Complex.mul(Complex.B, Complex.NEG_I));
    });

    test('Associativity in addition', () =>
    {
        expect(Complex.add(Complex.ONE, Complex.add(Complex.A, Complex.B)))
        .toBe(Complex.add(Complex.add(Complex.ONE, Complex.A), Complex.B));
    });

    test('Associativity in multiplication', () =>
    {
        expect(Complex.mul(Complex.A, Complex.mul(Complex.B, Complex.I)))
        .toBe(Complex.mul(Complex.mul(Complex.A, Complex.B), Complex.I));
    });

    test('Out of bounds for Complex.get()', () =>
    {
        expect(Complex.get(100_000)).toBeUndefined();
    });

    test('In bounds for Complex.get()', () =>
    {
        expect(Complex.get(5)!.toString()).toBe('0;0;-1;0;1');
    });

    test('Adding two complex numbers', () =>
    {
        const c0 = new Complex(10, 8, 2, 14, 9);
        const c1 = new Complex( 1, 2, 3,  4, 5);
        const sum = Complex.get(Complex.add(c0.index, c1.index))!;

        expect(sum.re()).toBeCloseTo(2.22249318, 7);
        expect(sum.im()).toBeCloseTo(2.48785152, 7);
    });

    test('Multiplying two complex numbers', () =>
    {
        const c0 = new Complex(1, 0, 2, 0);
        const c1 = new Complex(0, 3, 5, 0);
        const prod = Complex.get(Complex.mul(c0.index, c1.index))!;

        expect(prod.re()).toBeCloseTo(-7.87867966, 7);
        expect(prod.im()).toBeCloseTo(9.24264069,  6);
    });

    test('Dividing two complex numbers', () =>
    {
        const c0 = new Complex(1, 0, 2, 0);
        const c1 = new Complex(0, 1, 1, 0);
        const quot = Complex.get(Complex.div(c0.index, c1.index))!;

        expect(quot.re()).toBeCloseTo(1.80473785,  7);
        expect(quot.im()).toBeCloseTo(0.276142375, 8);
    });

    test('Mixing operations #1', () =>
    {
        const c0 = new Complex(1, 0, 2, 0);
        const c1 = new Complex(0, 1, 1, 0);
        const c3 = new Complex(0, 0, 0, 1);
        const c4 = new Complex(1, 1, 0, 0);
        const quot  = Complex.div(c0.index, c1.index);
        const sum   = Complex.add(quot, c3.index);
        const final = Complex.get(Complex.mul(sum, c4.index))!;

        expect(final.re()).toBeCloseTo(3.08088022, 7);
        expect(final.im()).toBeCloseTo(1.6785113,  6);
    });

    test('Mixing operations #2', () => 
    {
        const prod = Complex.mul(Complex.A, Complex.A);
        const quot = Complex.div(Complex.ONE, prod);
        const final = Complex.get(quot)!;
        
        expect(final.re()).toBeCloseTo(2, 5);
        expect(final.im()).toBeCloseTo(0, 5);
    });

    test('Passing wrong indeces in add, mul, div, argmax', () =>
    {
        expect(() => { Complex.add(0.5, -1); }).toThrow('Error in Complex.add(): Out of bounds value passed.');
        
        expect(() => { Complex.mul(100_000, 1); }).toThrow('Error in Complex.mul(): Out of bounds value passed.');
        // @ts-expect-error
        expect(() => { Complex.div(2, 'a')}).toThrow('Error in Complex.div(): Out of bounds value passed.');

        expect(() => { Complex.mul(); }).toThrow('Error in Complex.mul(): No values passed.');

        expect(() => { Complex.argmax([]); }).toThrow('Error in Complex.argmax(): No values passed.');

        expect(() => { Complex.argmax([10_000, 1]); }).toThrow('Error in Complex.argmax(): Out of bounds value passed.');
    });

    test('Argmaxing a single element', () =>
    {
        expect(Complex.argmax([1])).toBe(1);
    });

    test('Argmaxing over the default values', () =>
    {
        expect(Complex.argmax([Complex.ZERO, Complex.ONE, Complex.A, Complex.NEG_ONE, Complex.I, Complex.NEG_I, Complex.NEG_A, Complex.B, Complex.C]))
        .toBe(Complex.ONE);  // ONE, NEG_ONE, I, NEG_I, B and C all give the max square magnitude 1. Since ONE is first, that should be returned.
    });

    test('Argmaxing over custom values', () =>
    {
        const expected  = new Complex(1, 1, 1, 1).index;
        const other     = new Complex(10, 8, 2, 14, 9).index;

        expect(Complex.argmax([Complex.NEG_ONE, expected, other])).toBe(expected);
    });
});

describe('Complex: Creating default value', () =>
{
    const data: [number, number[]][] = [
        [Complex.ZERO,    [ 0,  0,  0,  0]],
        [Complex.ONE,     [ 1,  0,  0,  0]],
        [Complex.A,       [ 0,  1,  0,  0]],
        [Complex.NEG_ONE, [-1,  0,  0,  0]],
        [Complex.I,       [ 0,  0,  1,  0]],
        [Complex.NEG_I,   [ 0,  0, -1,  0]],
        [Complex.NEG_A,   [ 0, -1,  0,  0]],
        [Complex.B,       [ 0,  1,  0,  1]],
        [Complex.C,       [ 0,  1,  0, -1]]];

    for (const [og, def] of data)
        test(`i(${og})`, () =>
        {
            expect(new Complex(def[0], def[1], def[2], def[3]).index).toBe(og)                
        });
});

describe('Complex: Cache check:', () =>
{
    const c0 = new Complex(3, 4, 5, 6);
    const c1 = new Complex(5, 4, 3, 2);
    const c3 = new Complex(3, 4, 5, 6);
    const c4 = new Complex(6, 8, 10, 12, 2);

    test('Definitions', () =>
    {
        expect(c0.index).toBe(c3.index);
    });

    test('Factorizations', () =>
    {
        expect(c0.index).toBe(c4.index);
    });

    test('Additions', () =>
    {
        expect(Complex.add(c0.index, c1.index)).toBe(Complex.add(c0.index, c1.index));
    });

    test('Multiplications', () =>
    {
        expect(Complex.mul(c0.index, c1.index)).toBe(Complex.mul(c0.index, c1.index));
    });

    test('Divisions', () =>
    {
        expect(Complex.div(c0.index, c1.index)).toBe(Complex.div(c0.index, c1.index));
    });
});

describe('Complex: Adding the inverse of', () =>
{
    const complex = new Complex(1, 2, 3, 4);
    const data: [number, number][] = [
        [Complex.ONE,   Complex.NEG_ONE],
        [Complex.I,     Complex.NEG_I],
        [Complex.A,     Complex.NEG_A],
        [complex.index, Complex.mul(complex.index, Complex.NEG_ONE)]];

    for (const [vice, versa] of data)
        test(`i(${vice})`, () =>
        {
            const sum = Complex.add(vice, versa);

            expect(sum).toBe(Complex.ZERO);
        });
});

describe('Verifying actual value of default index ', () =>
{
    const a = Math.sqrt(0.5);
    const data: [number, [number, number]][] = [
        [Complex.ZERO,    [ 0,  0]],
        [Complex.ONE,     [ 1,  0]],
        [Complex.A,       [ a,  0]],
        [Complex.NEG_ONE, [-1,  0]],
        [Complex.I,       [ 0,  1]],
        [Complex.NEG_I,   [ 0, -1]],
        [Complex.NEG_A,   [-a,  0]],
        [Complex.B,       [ a,  a]]];

    for (const [i, amps] of data)
        test(`i(${i})`, () =>
        {
            expect([Complex.get(i)!.re(), Complex.get(i)!.im()]).toEqual(amps);                
        });
});