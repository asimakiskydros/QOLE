import { QuantumCircuit } from '../src/index';
import { zip } from '../src/utils/iterators';
import { CCX, Control, CX, H, I, S, X, Y,  } from '../src/circuit/gates';

const a = Math.round(Math.sqrt(0.5) * 10000) / 10000;

describe("QuantumCircuit", () => 
{
    describe("should throw for abnormal number of qubits:", () =>
    {
        test("\nNon-numerical input", () =>
        {
            // @ts-expect-error
            expect(() => { new QuantumCircuit('lmaoo'); })
            .toThrow("Can\'t create a circuit with lmaoo qubits.")
        });

        test("\nFloat number of qubits", () =>
        {
            expect(() => { new QuantumCircuit(0.5); })
            .toThrow("Can\'t create a circuit with 0.5 qubits.")
        });

        test("\nNegative number of qubits", () =>
        {
            expect(() => { new QuantumCircuit(-5); })
            .toThrow("Can\'t create a circuit with -5 qubits.")
        });
    });

    test("should return the correct information for width and depth", () => 
    {
        const qc     = new QuantumCircuit(2);
        const width  = qc.width();
        const depth  = qc.depth();
        const depth1 = qc.not(0).depth();
        const depth2 = qc.z(0).depth();
        const width1 = qc.width();

        expect([width, width1, depth, depth1, depth2]).toEqual([2, 2, 0, 1, 2]);
    });

    test("should correctly append gates", () => 
    {
        const qc = 
            new QuantumCircuit(2)
            .h(0)
            .s(1)
            .feynman(0, 1);

        for (const [recStep, expStep] of zip(qc.asGateMatrix(), [
            [new H(),       new S()],
            [new Control(), new X()]
        ]))
            for (const [received, expected] of zip(recStep, expStep))
                expect(received === expected).toBe(true);
    });

    test("should throw for wrong Gate input in append()", () =>
    {
        const qc = new QuantumCircuit(1);

        // @ts-expect-error
        expect(() => { qc.append('lmaoo', [0]); })
        .toThrow("Invalid input type for gate in QuantumCircuit.append (expected a Gate, got string).");
    });

    describe("should throw for wrong qubit index input in append():", () =>
    {
        test("\nFewer than expected", () =>
        {
            const qc = new QuantumCircuit(3);

            expect(() => { qc.append(new CCX(), [0, 1]); })
            .toThrow(
                "Specified Gate in QuantumCircuit.append is incompatible with the desired index stream" + 
                " (Gate affects 3 qubits and the specified indeces are 2).");
        });

        test("\nMore than expected", () =>
        {
            const qc = new QuantumCircuit(3);

            expect(() => { qc.append(new CCX(), [0, 1, 2, 3]); })
            .toThrow(
                "Specified Gate in QuantumCircuit.append is incompatible with the desired index stream" + 
                " (Gate affects 3 qubits and the specified indeces are 4).");
        });

        test("\nOut of bounds index", () =>
        {
            const qc = new QuantumCircuit(3);

            expect(() => { qc.append(new X(), [4]); })
            .toThrow("Qubit position specified in QuantumCircuit.append exceeds the defined qubit range (expected [0, 3), got 4).");
        });

        test("\nNon-numerical index", () =>
        {
            const qc = new QuantumCircuit(1);

            // @ts-expect-error
            expect(() => { qc.append(new CX(), [0, 'lmaoo']); })
            .toThrow("Invalid qubit position type in QuantumCircuit.append (expected an integer, got lmaoo).");
        });

        test("\nFloat-point index", () =>
        {
            const qc = new QuantumCircuit(1);

            expect(() => { qc.append(new X(), [0.5]); })
            .toThrow("Invalid qubit position type in QuantumCircuit.append (expected an integer, got 0.5).");
        });
    });

    describe("should throw for invalid inputs in initialize():", () =>
    {
        test("\nNon-string initial state", () =>
        {
            // @ts-expect-error
            expect(() => { new QuantumCircuit(1).initialize(null); })
            .toThrow("Invalid input type for initialState in QuantumCircuit.initialize (expected {string, number}, got object).");
        });

        test("\nWrong qubit token inside string", () =>
        {
            expect(() => { new QuantumCircuit(3).initialize('0a1'); })
            .toThrow("Unexpected qubit initial state specified in QuantumCircuit.initialize (got 'a', expected '0'/'1'/'+'/'-'/'r'/'l').")
        });

        test("\nToo short initial state", () =>
        {
            expect(() => { new QuantumCircuit(2).initialize('1'); })
            .toThrow("QuantumCircuit.initialize state specifications must encompass exactly all qubits (got '1' but the qubits are 2).")
        });

        test("\nToo long initial state", () =>
        {
            expect(() => { new QuantumCircuit(2).initialize('111'); })
            .toThrow("QuantumCircuit.initialize state specifications must encompass exactly all qubits (got '111' but the qubits are 2).")
        });

        test("\nNegative number for initial state", () =>
        {
            expect(() => { new QuantumCircuit(1).initialize(-1); })
            .toThrow("Invalid input type for initialState in QuantumCircuit.initialize (expected a non-negative integer, got -1).");
        });

        test("\nFloat number for initial state", () =>
        {
            expect(() => { new QuantumCircuit(1).initialize(0.5); })
            .toThrow("Invalid input type for initialState in QuantumCircuit.initialize (expected a non-negative integer, got 0.5).");
        });
    });

    describe("should throw for invalid inputs in statevector():", () =>
    {
        test("\nUnexpected output specification", () =>
        {
            // @ts-expect-error
            expect(() => { new QuantumCircuit(1).statevector('lmaoo'); })
            .toThrow("Invalid output type in QuantumCircuit.statevector (expected {'generator', 'record'}, got lmaoo).");
        });

        test("\nNon-numerical decimal specification", () =>
        {
            // @ts-expect-error
            expect(() => { new QuantumCircuit(1).statevector('record', 'lmaoo'); })
            .toThrow("Invalid input in QuantumCircuit.statevector: Can't round to lmaoo decimal places.");
        });

        test("\nNegative number decimal specification", () =>
        {
            expect(() => { new QuantumCircuit(1).statevector('record', -1); })
            .toThrow("Invalid input in QuantumCircuit.statevector: Can't round to -1 decimal places.");
        });

        test("\nFloat number decimal specification", () =>
        {
            expect(() => { new QuantumCircuit(1).statevector('record', 2.5); })
            .toThrow("Invalid input in QuantumCircuit.statevector: Can't round to 2.5 decimal places.");
        });
    });

    describe("should correctly initialize to a given", () =>
    {
        test("string state at the back of a circuit", () => 
        {
            const qc = new QuantumCircuit(6).initialize('lr-+10');
    
            for (const [recStep, expStep] of zip(qc.asGateMatrix(), [
                [new I(), new X(), new H(), new X(), new H(), new X()],
                [new I(), new I(), new I(), new H(), new S(), new H()],
                [new I(), new I(), new I(), new I(), new I(), new S()]
            ]))
                for (const [received, expected] of zip(recStep, expStep))
                    expect(received === expected).toBe(true);
        });

        test("string state at the front of a circuit", () => 
        {
            const qc = 
                new QuantumCircuit(2)
                .h(0)
                .initialize('l1', true);
            
            for (const [recStep, expStep] of zip(qc.asGateMatrix(), [
                [new X(), new X()],
                [new H(), new H()],
                [new I(), new S()]
            ]))
                for (const [received, expected] of zip(recStep, expStep))
                    expect(received === expected).toBe(true);
        });

        test("number state", () =>
        {
            const qc = 
                new QuantumCircuit(3)
                .initialize(3);
            
            for (const [recStep, expStep] of zip(qc.asGateMatrix(), [
                [new X(), new X(), new I()]
            ]))
                for (const [received, expected] of zip(recStep, expStep))
                    expect(received === expected).toBe(true);
        });
    });

    describe("should correctly apply", () =>
    {
        test("SWAP gates", () => 
        {
            const qc = 
                new QuantumCircuit(3)
                .h(1)
                .swap(0, 2)
                .y(1);
            
            for (const [recStep, expStep] of zip(qc.asGateMatrix(), [
                [new I(),       new H(), new I()      ],
                [new Control(), new I(), new X()      ],
                [new X(),       new I(), new Control()],
                [new Control(), new I(), new X()      ],
                [new I(),       new Y(), new I()      ]
            ]))
                for (const [received, expected] of zip(recStep, expStep))
                    expect(received === expected).toBe(true);
        });

        test("Fredkin gates", () => 
        {
            const qc = 
                new QuantumCircuit(3)
                .cswap(0, 1, 2);
    
            for (const [recStep, expStep] of zip(qc.asGateMatrix(), [
                [new I(),       new X(),       new Control()],
                [new Control(), new Control(), new X()      ],
                [new I(),       new X(),       new Control()]
            ]))
                for (const [received, expected] of zip(recStep, expStep))
                    expect(received === expected).toBe(true);
        });
    });

    describe("should correctly execute", () =>
    {
        for (const [state, sv] of zip('01+-rl', [
            { '0': { real: 1, imag: 0 }},
            { '1': { real: 1, imag: 0 }},
            { '0': { real: a, imag: 0 }, '1': { real:  a, imag:  0 }},
            { '0': { real: a, imag: 0 }, '1': { real: -a, imag:  0 }},
            { '0': { real: a, imag: 0 }, '1': { real:  0, imag:  a }},
            { '0': { real: a, imag: 0 }, '1': { real:  0, imag: -a }},
        ]))
            test(`an empty circuit, initialized on ${state}`, () =>
            {
                const qc = 
                    new QuantumCircuit(1)
                    .initialize(state);

                expect(qc.statevector('record')).toEqual(sv);
            });

        test("a completely empty circuit", () =>
        {
            const qc = new QuantumCircuit(5);

            expect(qc.statevector('record')).toEqual({ '00000': { real: 1, imag: 0 }});
        });

        for (const [i, sv] of [{ '1': { real: 1, imag: 0 }}, { '0': { real:  1, imag:  0 }}].entries())
            test(`.x() for the initial state ${i}`, () =>
            {
                const qc = 
                    new QuantumCircuit(1)
                    .initialize(i.toString())
                    .x(0);
                
                expect(qc.statevector('record')).toEqual(sv);
            });

        for (const [i, sv] of [{ '1': { real: 0, imag: 1 }}, { '0': { real:  0, imag: -1 }}].entries())
            test(`.y() for the initial state ${i}`, () =>
            {
                const qc = 
                    new QuantumCircuit(1)
                    .initialize(i.toString())
                    .y(0);
                
                expect(qc.statevector('record')).toEqual(sv);
            });

        for (const [i, sv] of [{ '0': { real: 1, imag: 0 }}, { '1': { real: -1, imag:  0 }}].entries())
            test(`.z() for the initial state ${i}`, () =>
            {
                const qc = 
                    new QuantumCircuit(1)
                    .initialize(i.toString())
                    .z(0);
                
                expect(qc.statevector('record')).toEqual(sv);
            });

        for (const [i, sv] of [{ '0': { real: 1, imag: 0 }}, { '1': { real:  0, imag:  1 }}].entries())
            test(`.s() for the initial state ${i}`, () =>
            {
                const qc = 
                    new QuantumCircuit(1)
                    .initialize(i.toString())
                    .s(0);
                
                expect(qc.statevector('record')).toEqual(sv);
            });
        
        for (const [i, sv] of [
            { '0': { real: a, imag: 0 }, '1': { real: a,  imag: 0 }},
            { '0': { real: a, imag: 0 }, '1': { real: -a, imag: 0 }}
        ].entries())
            test(`.h() for the initial state ${i}`, () =>
            {
                const qc = 
                    new QuantumCircuit(1)
                    .initialize(i.toString())
                    .h(0);
                
                expect(qc.statevector('record')).toEqual(sv);
            });

        for (const [i, sv] of [
            { '00': { real: 1, imag: 0 } }, 
            { '11': { real: 1, imag: 0 } },
            { '10': { real: 1, imag: 0 } }, 
            { '01': { real: 1, imag: 0 } }
        ].entries())
            test(`.cx() for the initial state ${i.toString(2).padStart(2, '0')}`, () =>
            {
                const qc = 
                    new QuantumCircuit(2)
                    .initialize(i.toString(2).padStart(2, '0'))
                    .cx(0, 1);
                
                expect(qc.statevector('record')).toEqual(sv);
            });

        for (const [i, sv] of [
            { '00': { real: 1, imag:  0 } }, 
            { '11': { real: 0, imag:  1 } }, 
            { '10': { real: 1, imag:  0 } }, 
            { '01': { real: 0, imag: -1 } }
        ].entries())
            test(`.cy() for the initial state ${i.toString(2).padStart(2, '0')}`, () =>
            {
                const qc = 
                    new QuantumCircuit(2)
                    .initialize(i.toString(2).padStart(2, '0'))
                    .cy(0, 1);
                
                expect(qc.statevector('record')).toEqual(sv);
            });

        for (const [i, sv] of [
            { '00': { real:  1, imag: 0 } }, 
            { '01': { real:  1, imag: 0 } }, 
            { '10': { real:  1, imag: 0 } }, 
            { '11': { real: -1, imag: 0 } }
        ].entries())
            test(`.cz() for the initial state ${i.toString(2).padStart(2, '0')}`, () =>
            {
                const qc = 
                    new QuantumCircuit(2)
                    .initialize(i.toString(2).padStart(2, '0'))
                    .cz(0, 1);
                
                expect(qc.statevector('record')).toEqual(sv);
            });

        for (const [i, sv] of [
            { '00': { real: 1, imag: 0 } }, 
            { '01': { real: 1, imag: 0 } }, 
            { '10': { real: 1, imag: 0 } }, 
            { '11': { real: 0, imag: 1 } }
        ].entries())
            test(`.cs() for the initial state ${i.toString(2).padStart(2, '0')}`, () =>
            {
                const qc = 
                    new QuantumCircuit(2)
                    .initialize(i.toString(2).padStart(2, '0'))
                    .cs(0, 1);
                
                expect(qc.statevector('record')).toEqual(sv);
            });
        
        for (const [i, sv] of [
            { '00': { real: 1, imag: 0 } }, 
            { '01': { real: a, imag: 0 }, '11': { real: a,  imag: 0 } }, 
            { '10': { real: 1, imag: 0 } }, 
            { '01': { real: a, imag: 0 }, '11': { real: -a, imag: 0 }}
        ].entries())
            test(`.ch() for the initial state ${i.toString(2).padStart(2, '0')}`, () =>
            {
                const qc = 
                    new QuantumCircuit(2)
                    .initialize(i.toString(2).padStart(2, '0'))
                    .ch(0, 1);
                
                expect(qc.statevector('record')).toEqual(sv);
            });

        for (const [i , state] of ['00', '10', '01', '11'].entries())
            test(`.swap() for initial state ${i.toString(2).padStart(2, '0')}`, () => 
            {
                const qc = 
                    new QuantumCircuit(2)
                    .initialize(i.toString(2).padStart(2, '0'))
                    .swap(0, 1);
    
                const sv: Record<string, { real: number, imag: number }> = {};
                sv[state] = { real: 1, imag: 0 };
    
                expect(qc.statevector('record')).toEqual(sv);
            });

        for (const [i, state] of ['000', '001', '010', '111', '100', '101', '110', '011'].entries())
            test(`.ccx() for initial state ${i.toString(2).padStart(3, '0')}`, () =>
            {
                const qc = 
                    new QuantumCircuit(3)
                    .initialize(i.toString(2).padStart(3, '0'));

                // this is stupid but Jest insists on both methods be checked and i don't want to silence .toffoli
                if (i < 4) qc.ccnot(0, 1, 2); else qc.toffoli(0, 1, 2);

                const sv: Record<string, { real: number, imag: number }> = {};
                sv[state] = { real: 1, imag: 0 };
    
                expect(qc.statevector('record')).toEqual(sv);               
            });

        for (const [i, state] of ['000', '001', '010', '011', '100', '101', '110', '111'].entries())
            test(`.ccz() for initial state ${i.toString(2).padStart(3, '0')}`, () =>
            {
                const qc = 
                    new QuantumCircuit(3)
                    .initialize(i.toString(2).padStart(3, '0'))
                    .ccz(0, 1, 2);
                    
                const sv: Record<string, { real: number, imag: number }> = {};
                sv[state] = { real: i === 7 ? -1 : 1, imag: 0 };

                expect(qc.statevector('record')).toEqual(sv);
            });

        for (const [i, state] of ['000', '001', '100', '011', '010', '101', '110', '111'].entries())
            test(`.fredkin() for initial state ${i.toString(2).padStart(3, '0')}, conditioned on 0`, () =>
            {
                const qc = 
                    new QuantumCircuit(3)
                    .initialize(i.toString(2).padStart(3, '0'))
                    .fredkin(0, 1, 2, '0');

                const sv: Record<string, { real: number, imag: number }> = {};
                sv[state] = { real: 1, imag: 0 };

                expect(qc.statevector('record')).toEqual(sv);
            });

        for (const { state, out } of [
            { state: '10000', out: '11000' },
            { state: '00100', out: '00100' },
        ])
            test(`.mcx() for initial state ${state}, conditioned on 0`, () => 
            {
                const qc = 
                    new QuantumCircuit(5)
                    .initialize(state)
                    .mcx([0, 1, 2], 3, 0);
    
                const sv: Record<string, { real: number, imag: number }> = {};
                sv[out] = { real: 1, imag: 0 };
    
                expect(qc.statevector('record')).toEqual(sv);
            });

        test(".mcx() with target in between the controls", () =>
        {
            const qc = 
                new QuantumCircuit(4)
                .initialize('1111')
                .mcnot([0, 1, 3], 2);
            
            expect(qc.statevector('record')).toEqual({ '1011': { real: 1, imag: 0 }});
        });
    });

    test("should calculate the correct statevector for the Hadamard transform", () => 
    {
        const qc = 
            new QuantumCircuit(2)
            .h(0).h(1);
        
        let i = 0;
        const states = ['00', '01', '10', '11'];

        for (const [state, real, imag] of qc.statevector())
        {
            const i = states.findIndex(el => el === state);

            if (i !== -1) states.splice(i, 1);

            expect(i).not.toBe(-1);
            expect([real, imag]).toEqual([0.5, 0]);
        }
    });

    for (const { order, state, sv } of [
        { order: 'first',  state: '00', sv: { '00': { real: a, imag: 0 }, '11': { real:  a, imag: 0 } }},
        { order: 'second', state: '01', sv: { '00': { real: a, imag: 0 }, '11': { real: -a, imag: 0 } }},
        { order: 'third',  state: '10', sv: { '01': { real: a, imag: 0 }, '10': { real:  a, imag: 0 } }},
        { order: 'fourth', state: '11', sv: { '10': { real: a, imag: 0 }, '01': { real: -a, imag: 0 } }}
    ])
        test(`should correctly generate the ${order} Bell state`, () => 
        {
            const qc = 
                new QuantumCircuit(2)
                .initialize(state)
                .h(0)
                .cnot(0, 1);

            expect(qc.statevector('record')).toEqual(sv);
        });

    test("should correctly generate the 4-qubit GHZ state", () => 
    {
        const qc = 
            new QuantumCircuit(4)
            .h(0)
            .cx(0, 1)
            .cx(1, 2)
            .cx(2, 3);

        expect(qc.statevector('record')).toEqual({
            '0000': { real: a, imag: 0 },
            '1111': { real: a, imag: 0 }
        });
    });
});