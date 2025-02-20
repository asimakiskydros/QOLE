import { Complex } from '../src/complex';
import { 
    CCX, CCZ, CH, Control, CS, CSdag, CX, CY, CZ,
    H, I, MCX, S, Sdag, T, Tdag, X, Y, Z } from '../src/gates';


describe("Control: ", () =>
{
    test("|1> case singleton check", () =>
    {
        const ctrl1 = new Control();
        const ctrl2 = new Control();

        expect(ctrl1 === ctrl2).toBe(true);
    });

    test("|0> case singleton check", () =>
    {
        const ctrl1 = new Control(true);
        const ctrl2 = new Control(true);

        expect(ctrl1 === ctrl2).toBe(true);
    });

    test("Distinct singletons between cases", () =>
    {
        const ctrl0 = new Control(true);
        const ctrl1 = new Control();

        expect(ctrl0 === ctrl1).toBe(false);
    });

    test("|0> case matrix check", () =>
    {
        const ctrl = new Control(true);

        expect(ctrl.matrix()).toEqual([1, 0, 0, 0]);
    });

    test("|1> case matrix check", () =>
    {
        const ctrl = new Control();

        expect(ctrl.matrix()).toEqual([0, 0, 0, 1]);
    });

    test("|0> case activates on index 0", () =>
    {
        const ctrl = new Control(true);

        expect(ctrl.activator()).toBe(0);
    });

    test("|1> case activates on index 3", () =>
    {
        const ctrl = new Control();

        expect(ctrl.activator()).toBe(3);
    });
});

for (const { gate, matrix } of [
    { gate: I, matrix: [1, 0, 0, 1] },
    { gate: X, matrix: [0, 1, 1, 0] },
    { gate: Y, matrix: [0, Complex.I, Complex.NEG_I, 0] },
    { gate: Z, matrix: [1, 0, 0, Complex.NEG_ONE] },
    { gate: H, matrix: [Complex.A, Complex.A, Complex.A, Complex.NEG_A] },
    { gate: S, matrix: [1, 0, 0, Complex.I] },
    { gate: T, matrix: [1, 0, 0, Complex.B] },
    { gate: Sdag, matrix: [1, 0, 0, Complex.NEG_I] },
    { gate: Tdag, matrix: [1, 0, 0, Complex.C] }
])
    describe(gate.name, () => 
    {
        test(" singleton check", () => 
        {
            const obj1 = new gate();
            const obj2 = new gate();

            expect(obj1 === obj2).toBe(true);
        });

        test(" matrix check", () => 
        {
            const obj = new gate();

            expect(obj.matrix()).toEqual(matrix);
        });

        test(" unwraps to itself only", () => 
        {
            const obj = new gate();

            expect(obj.unwrap()).toEqual([[], [obj]]);
        });
    });

for (const { gate, target } of [
    { gate: CX, target: X },
    { gate: CY, target: Y },
    { gate: CZ, target: Z },
    { gate: CH, target: H },
    { gate: CS, target: S },
    { gate: CSdag, target: Sdag }
])
    describe(gate.name, () => 
    {
        test(` unwraps to 1 control and 1 ${target.name}`, () =>
        {
            const obj = new gate();

            expect(obj.unwrap()).toEqual([[new Control()], [new target()]]);
        });

        test(` generates the correct underlying Control`, () => 
        {
            const obj1 = new gate();
            const obj0 = new gate('0');
            const ctrl1 = obj1.unwrap().at(0)?.at(0) as Control;
            const ctrl0 = obj0.unwrap().at(0)?.at(0) as Control;

            expect(
                ctrl1.activator() === 3 && 
                ctrl0.activator() === 0)
            .toBe(true);
        });

        test(` equals a ${target.name} controlled once`, () => 
        {
            const state = 0;
            const obj = new gate(state);
            const controlledTarget = new target().control(1, state);

            expect(obj.unwrap()).toEqual(controlledTarget.unwrap());
        });
    });

for (const { gate, target } of [
    { gate: CCX, target: X },
    { gate: CCZ, target: Z },
])
    describe(gate.name, () =>
    {
        test(` unwraps to 2 controls and 1 ${target.name}`, () =>
        {
            const obj = new gate();

            expect(obj.unwrap()).toEqual([[new Control(), new Control()], [new target()]]);
        });

        test(" generates the correct underlying Controls", () =>
        {
            const state = 1;
            const objUnwrapped = new gate(state).unwrap();
            const ctrl1 = objUnwrapped.at(0)?.at(0) as Control;
            const ctrl2 = objUnwrapped.at(0)?.at(1) as Control;

            expect([ctrl1.activator(), ctrl2.activator()]).toEqual([3, 0]);
        });

        test(` equals a ${target.name} controlled twice`, () =>
        {
            const obj = new gate();
            const twoCtrlTarget = new target().control(1).control(1);

            expect(obj.unwrap()).toEqual(twoCtrlTarget.unwrap());
        });
    });

describe("MCXGate ", () =>
{
    test("unwraps to m controls and 1 X", () =>
    {
        const m = 5
        const mcx = new MCX(m);
        const controls = new Array(m).fill(new Control());

        expect(mcx.unwrap()).toEqual([controls, [new X()]]);
    });

    test("equals an X for 0 controls", () => 
    {
        const x   = new X();
        const mcx = new MCX(0);
        
        expect(mcx.unwrap()).toEqual(x.unwrap());
    });

    test("equals a CX for 1 control", () =>
    {
        const cx  = new CX();
        const mcx = new MCX(1);

        expect(mcx.unwrap()).toEqual(cx.unwrap());
    });

    test("equals a CCX for 2 controls", () => 
    {
        const state = '10';
        const ccx = new CCX(state);
        const mcx = new MCX(2, state);

        expect(mcx.unwrap()).toEqual(ccx.unwrap());
    });

    test("equals an X controlled m times", () =>
    {
        const m = 5;
        const state = Math.ceil(m / 2).toString(2).padStart(m, '0');
        const mcx = new MCX(m, state);
        const mControlledX = new X().control(m, state);

        expect(mcx.unwrap()).toEqual(mControlledX.unwrap());
    });

    describe("throws for:", () =>
    {
        test("\nIncorrect control state type", () =>
        {
            // @ts-expect-error
            expect(() => { new MCX(3, true)})
            .toThrow("Invalid input type for ctrlState in ControlledGate (expected {string, number, undefined}, got boolean).");
        });
    
        describe("\nInvalid control state string:", () =>
        {
            test("\nNon-bit character", () =>
            {
                expect(() => { new MCX(3, '1c0')})
                .toThrow("Unexpected control state encountered in ControlledGate (got c).")     
            });
    
            test("\nMore bits than expected", () => 
            {
                expect(() => { new MCX(3, '1111'); })
                .toThrow("Specified control state in ControlledGate isn't applicable to the declared number of controls (got 3 controls and state '1111').");
            });
        });
    
        describe("\nInvalid controls number:", () =>
        {
            test("\nFloat number of controls", () =>
            {
                expect(() => { new MCX(2.5); })
                .toThrow("Cannot declare a ControlledGate with 2.5 number of controls.");    
            });

            test("\nNegative number of controls", () =>
            {
                expect(() => { new MCX(-2); })
                .toThrow("Cannot declare a ControlledGate with -2 number of controls.");    
            });
        });
    
        test("\nAttempting to fetch its matrix", () =>
        {
            expect(() => { new MCX(2).matrix(); })
            .toThrow("MCX class doesn't implement matrix().");
        });
    
        describe("\nInvalid control state number:", () =>
        {
            test("\nFloat number for control state", () => 
            {
                expect(() => { new MCX(1, 0.5); })
                .toThrow("Can't declare a ControlledGate that satisfies on 0.5.");    
            });
    
            test("\nNegative for control state", () =>
            {
                expect(() => { new MCX(1, -2); })
                .toThrow("Can't declare a ControlledGate that satisfies on -2.");    
            });

            test("\nState too long for the number of controls", () =>
            {               
                expect(() => { new MCX(3, 8); })
                .toThrow("Specified control state in ControlledGate isn't applicable to the declared number of controls (got 3 controls and state 8 = '1000').");
            });
        });
    });
});