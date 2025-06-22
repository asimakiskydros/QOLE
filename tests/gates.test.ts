import { Complex } from '../src/complex';
import { H, I, S, T, X, Y, Z } from '../src/gates';


for (const { gate, matrix } of [
    { gate: I, matrix: [1, 0, 0, 1] },
    { gate: X, matrix: [0, 1, 1, 0] },
    { gate: Y, matrix: [0, Complex.NEG_I, Complex.I, 0] },
    { gate: Z, matrix: [1, 0, 0, Complex.NEG_ONE] },
    { gate: H, matrix: [Complex.A, Complex.A, Complex.A, Complex.NEG_A] }
])
    describe(`${gate.name}: `, () => 
    {
        test("Singleton check", () => 
        {
            const obj1 = new gate();
            const obj2 = new gate();

            expect(obj1 === obj2).toBe(true);
        });

        test("Matrix check", () => 
        {
            const obj = new gate();

            expect(obj.matrix()).toEqual(matrix);
        });
    });

for (const { gate, normal, dagger } of [
    { gate: S, normal: [1, 0, 0, Complex.I], dagger: [1, 0, 0, Complex.NEG_I] },
    { gate: T, normal: [1, 0, 0, Complex.B], dagger: [1, 0, 0, Complex.C] },
])
    describe(`${gate.name}: `, () => 
    {
        test("Singleton check", () => 
        {
            const obj1 = new gate();
            const obj2 = new gate(false);

            expect(obj1 === obj2).toBe(true);
        });

        test("Matrix check", () => 
        {
            const obj = new gate();

            expect(obj.matrix()).toEqual(normal);
        });

        test("Dagger Singleton check", () => 
        {
            const obj1 = new gate(true);
            const obj2 = new gate(true);

            expect(obj1 === obj2).toBe(true);
        });

        test("Normal and Dagger must not share singletons", () =>
        {
            const obj1 = new gate();
            const obj2 = new gate(true);

            expect(obj1 === obj2).toBe(false);
        });

        test("Dagger Matrix check", () => 
        {
            const obj = new gate(true);

            expect(obj.matrix()).toEqual(dagger);
        });
    });

