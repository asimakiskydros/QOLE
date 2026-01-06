import { Complex } from '../src/complex';
import { HGate, IGate, SGate, TGate, XGate, YGate, ZGate } from '../src/gates';


for (const { gate, matrix } of [
    { gate: IGate, matrix: [1, 0, 0, 1] },
    { gate: XGate, matrix: [0, 1, 1, 0] },
    { gate: YGate, matrix: [0, Complex.NEG_I, Complex.I, 0] },
    { gate: ZGate, matrix: [1, 0, 0, Complex.NEG_ONE] },
    { gate: HGate, matrix: [Complex.A, Complex.A, Complex.A, Complex.NEG_A] }
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
    { gate: SGate, normal: [1, 0, 0, Complex.I], dagger: [1, 0, 0, Complex.NEG_I] },
    { gate: TGate, normal: [1, 0, 0, Complex.B], dagger: [1, 0, 0, Complex.C] },
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

