import { QuantumCircuit } from "../src/circuit";
import { H, T, X } from "../src/gates";

type QC = QuantumCircuit;
type n = number;

/**
 * Square root of a half rounded to 4 decimals.
 */
const a = Math.round(Math.sqrt(0.5) * 10000) / 10000;

/**
 * Traverses two `ArrayLike Iterable`s of equal length at the same time, yielding their elements
 * at corresponding positions together as a tuple.
 * @param arr1 The first `Iterable`.
 * @param arr2 The second `Iterable`.
 * @throws if `arr1.length !== arr2.length`.
 */
function* zip <T, K> (arr1: ArrayLike<T>, arr2: ArrayLike<K>): Generator<[T, K]>
{
    if (arr1.length !== arr2.length) throw new Error('Unequal arrays.');

    for (let i = 0; i < arr1.length; i++)
        yield [arr1[i], arr2[i]];
}

describe('QuantumCircuit: ', () =>
{
    test('Control test (normal case)', () =>
    {
        expect(() => { new QuantumCircuit(3); }).not.toThrow();
    });

    for (const error of ['lmaoo', 0.5, -5])
        test(`Erroneous qubit specification (${error})`, () =>
        {
            // @ts-expect-error
            expect(() => { new QuantumCircuit(error); })
            .toThrow(`Error in QuantumCircuit(): Cannot create a circuit with ${error} qubits.`) 
        });

    test('.width() and .depth() check', () =>
    {
        const qc     = new QuantumCircuit(2);
        const width  = qc.width();
        const depth  = qc.depth();
        const depth1 = qc.x(0).depth();
        const depth2 = qc.z(0).depth();
        const width1 = qc.width();
        const depth3 = qc.initialize('00').depth();

        expect([width, width1, depth, depth1, depth2, depth3]).toEqual([2, 2, 0, 1, 2, 0]);
    });

    for (const { n, q, gate } of [
        { n:  'swap', q: 3, gate: (qc: QC) => { qc.swap(1, 2); } },
        { n: 'cswap', q: 4, gate: (qc: QC) => { qc.cswap(1, 2, 3); }}
    ])
        test(`.depth() on .${n}()`, () =>
        {
            const qc = new QuantumCircuit(q);
            
            qc.x(0).x(0);
            gate(qc);

            const depth1 = qc.depth();

            gate(qc);
            gate(qc);

            expect([depth1, qc.depth()]).toEqual([2, 3]);
        });

    describe('Erroneous inputs in .append(): ', () =>
    {
        test('Control test (normal case)', () =>
        {
            expect(() => { new QuantumCircuit(3).append(new X(), 0, [1, 2], '00'); })
            .not.toThrow();
        });

        test('Too many qubits requested', () =>
        {
            expect(() => { new QuantumCircuit(1).append(new X(), 0, [1]); })
            .toThrow(`Error in QuantumCircuit.append(): Too many qubits requested (declared width is 1 but 2 indices were received).`);
        });

        test('Out of bounds qubits requested', () =>
        {
            expect(() => { new QuantumCircuit(1).append(new X(), 2); })
            .toThrow(`Error in QuantumCircuit.append(): Out of bounds qubit requested (received index 2, expected [0, 1)).`);

            expect(() => { new QuantumCircuit(2).append(new X(), 0, [-1]); })
            .toThrow(`Error in QuantumCircuit.append(): Out of bounds qubit requested (received index -1, expected [0, 2)).`);
        });

        test('Duplicate qubit instance', () =>
        {
            expect(() => { new QuantumCircuit(5).append(new X(), 1, [0, 1, 2]); })
            .toThrow(`Error in QuantumCircuit.append(): Duplicate qubit index detected.`);

            expect(() => { new QuantumCircuit(5).append(new X(), 1, [0, 2, 3, 2]); })
            .toThrow(`Error in QuantumCircuit.append(): Duplicate qubit index detected.`);
        });

        test('Unequal number of control indices and states specified', () =>
        {
            expect(() => { new QuantumCircuit(3).append(new X(), 0, [1, 2], '000'); })
            .toThrow(`Error in QuantumCircuit.append(): Unequal number of controls (2) and control states (3) given.`);
        });

        test('Unrecognized control state', () =>
        {
            expect(() => { new QuantumCircuit(3).append(new X(), 0, [1, 2], 'as'); })
            .toThrow(`Error in QuantumCircuit.append(): Unrecognized character found in ctrlState, '0' or '1' were expected.`);
        });
    });

    describe('Erroneous inputs in .appendStep(): ', () =>
    {
        test('Control test (normal case)', () =>
        {
            expect(() => { new QuantumCircuit(3).appendStep([new X(), new H()], [0, 1]); })
            .not.toThrow();
        });

        test('Unequal number of control indices and states specified', () =>
        {
            expect(() => { new QuantumCircuit(3).appendStep([new X()], [1, 2]); })
            .toThrow(`Error in QuantumCircuit.appendStep(): Unequal number of gates (1) and qubit indices (2) given.`);
        });

        test('Too many qubits requested', () =>
        {
            expect(() => { new QuantumCircuit(1).appendStep([new X(), new H()], [0, 1]); })
            .toThrow(`Error in QuantumCircuit.appendStep(): Too many qubits requested (declared width is 1 but 2 indices were received).`);
        });

        test('Out of bounds qubits requested', () =>
        {
            expect(() => { new QuantumCircuit(1).appendStep([new X()], [2]); })
            .toThrow(`Error in QuantumCircuit.appendStep(): Out of bounds qubit requested (received index 2, expected [0, 1)).`);

            expect(() => { new QuantumCircuit(2).appendStep([new X()], [-1]); })
            .toThrow(`Error in QuantumCircuit.appendStep(): Out of bounds qubit requested (received index -1, expected [0, 2)).`);
        });

        test('Duplicate qubit instance', () =>
        {
            expect(() => { new QuantumCircuit(5).appendStep([new X(), new X(), new H()], [0, 1, 1]); })
            .toThrow(`Error in QuantumCircuit.appendStep(): Duplicate qubit index detected.`);

            expect(() => { new QuantumCircuit(5).appendStep([new X(), new X(), new H(), new T()], [0, 2, 3, 2]); })
            .toThrow(`Error in QuantumCircuit.appendStep(): Duplicate qubit index detected.`);
        });
    });

    describe('Erroneous inputs in .initialize(): ', () =>
    {
        test('Control test (normal case)', () =>
        {
            expect(() => { new QuantumCircuit(6).initialize('01+-lr'); }).not.toThrow();
        });

        test('Specified state not equal in qubits to the declared width', () =>
        {
            expect(() => { new QuantumCircuit(2).initialize('1'); })
            .toThrow(`Error in QuantumCircuit.initialize(): Specified state does not match the declared amount of qubits` + 
            `(2 qubits were declared but a state of 1 was given.)`);

            expect(() => { new QuantumCircuit(2).initialize('100'); })
            .toThrow(`Error in QuantumCircuit.initialize(): Specified state does not match the declared amount of qubits` + 
            `(2 qubits were declared but a state of 3 was given.)`);
        });

        test('Unrecognized qubit state', () =>
        {
            expect(() => { new QuantumCircuit(5).initialize('asdsd'); })
            .toThrow(`Error in QuantumCircuit.initialize(): Unrecognized character found in state, '0', '1', '+', '-', 'r' or 'l' were expected.`);
        });
    });

    describe('Erroneous inputs in .statevector(): ', () =>
    {
        test('Control test (normal case)', () =>
        {
            expect(() => { new QuantumCircuit(2).statevector(3); }).not.toThrow();
            expect(() => { new QuantumCircuit(2).statevector();  }).not.toThrow();
        });

        test('Negative precision requested', () =>
        {
            expect(() => { new QuantumCircuit(2).statevector(-2); })
            .toThrow(`Error in QuantumCircuit.statevector(): Cannot round to -2 decimal places.`)
        });

        test('Noninteger precision requested', () =>
        {
            expect(() => { new QuantumCircuit(2).statevector(0.5); })
            .toThrow(`Error in QuantumCircuit.statevector(): Cannot round to 0.5 decimal places.`)
        });
    });

    describe('Erroneous inputs in .sample(): ', () =>
    {
        test('Control test (normal case)', () =>
        {
            expect(() => { new QuantumCircuit(2).sample(3); }).not.toThrow();
            expect(() => { new QuantumCircuit(2).sample();  }).not.toThrow();   
            expect(() => { new QuantumCircuit(2).sample(undefined, 'lmaoo'); }).not.toThrow();
        });

        test('Negative amount of shots requested', () =>
        {
            expect(() => { new QuantumCircuit(2).sample(-2); })
            .toThrow(`Error in QuantumCircuit.sample(): Number of sample shots must be a positive integer (-2 was passed).`)
        });

        test('Noninteger amount of shots requested', () =>
        {
            expect(() => { new QuantumCircuit(2).sample(0.5); })
            .toThrow(`Error in QuantumCircuit.sample(): Number of sample shots must be a positive integer (0.5 was passed).`)
        });

        test('Zero shots requested', () =>
        {
            expect(() => { new QuantumCircuit(2).sample(0); })
            .toThrow(`Error in QuantumCircuit.sample(): Number of sample shots must be a positive integer (0 was passed).`)
        });
    });

    test('Starting circuit samples only to the ground state', () =>
    {
        const qubits = 5, shots = 1000;
        const counts = new QuantumCircuit(qubits).sample(shots);
        const state = '0'.repeat(qubits);

        expect(counts.get(state)?.occurrences).toBe(shots);
        expect(counts.get(state)?.re).toBeCloseTo(1, 5);
        expect(counts.get(state)?.im).toBeCloseTo(0, 5);
    });

    test('Basis states sample only to themselves', () =>
    {
        const qubits = 5, shots = 1000, repeats = 10;

        for (let j = 0; j < repeats; j++)
        {
            const qc = new QuantumCircuit(qubits);
            const state = Array(qubits).fill('0');
            
            for (let i = 0; i < qubits; i++) if (Math.random() < 0.5)
            {
                state[qubits - i - 1] = '1';
                qc.x(i);
            }
            const s = state.join('');
            const counts = qc.sample(shots);

            expect(counts.get(s)?.occurrences).toBe(shots);
            expect(counts.get(s)?.re).toBeCloseTo(1, 5);
            expect(counts.get(s)?.im).toBeCloseTo(0, 5);
        }
    });

    for (const [state, sv] of zip('01+-rl', [
        [{ state: '0', re: 1, im: 0 }],
        [{ state: '1', re: 1, im: 0 }],
        [{ state: '0', re: a, im: 0 }, { state: '1', re:  a, im:  0 }],
        [{ state: '0', re: a, im: 0 }, { state: '1', re: -a, im:  0 }],
        [{ state: '0', re: a, im: 0 }, { state: '1', re:  0, im:  a }],
        [{ state: '0', re: a, im: 0 }, { state: '1', re:  0, im: -a }]]
    ))
        test(`Empty circuit initialized on |${state}>`, () =>
        {
            const qc = new QuantumCircuit(1).initialize(state);

            expect([...qc.statevector()]).toEqual(sv);
        });

    test('Completely empty circuit', () =>
    {
        const qc = new QuantumCircuit(5);

        expect([...qc.statevector()]).toEqual([{ state: '00000', re: 1, im: 0 }]);
    });

    for (const { name, gate, svs} of [
        { name: 'x', gate: (qc: QC) => { qc.x(0); }, svs: [[{ state: '1', re: 1, im: 0 }], [{ state: '0', re:  1, im:  0 }]] },
        { name: 'y', gate: (qc: QC) => { qc.y(0); }, svs: [[{ state: '1', re: 0, im: 1 }], [{ state: '0', re:  0, im: -1 }]] },
        { name: 'z', gate: (qc: QC) => { qc.z(0); }, svs: [[{ state: '0', re: 1, im: 0 }], [{ state: '1', re: -1, im:  0 }]] },
        { name: 's', gate: (qc: QC) => { qc.s(0); }, svs: [[{ state: '0', re: 1, im: 0 }], [{ state: '1', re:  0, im:  1 }]] },
        { name: 't', gate: (qc: QC) => { qc.t(0); }, svs: [[{ state: '0', re: 1, im: 0 }], [{ state: '1', re:  a, im:  a }]] },
        { name: 'h', gate: (qc: QC) => { qc.h(0); }, svs: [
            [{ state: '0', re: a, im: 0 }, { state: '1', re:  a, im: 0 }],
            [{ state: '0', re: a, im: 0 }, { state: '1', re: -a, im: 0 }]]}
    ])
        for (const [i, sv] of svs.entries())
            test(`.${name}() for the initial state |${i}>`, () =>
            {
                const qc = 
                    new QuantumCircuit(1)
                    .initialize(i.toString());

                gate(qc);
                
                expect([...qc.statevector()]).toEqual(sv);
            });    
    
    for (const { n, gate, s, imre } of [
        { n:    'cz', gate: (qc: QC) => { qc.cz(0, 1);            }, s: ['00', '01', '10', '11'],                                  imre: (i: n) => [i === 3 ? -1 : 1, 0] },
        { n:    'cs', gate: (qc: QC) => { qc.cs(0, 1);            }, s: ['00', '01', '10', '11'],                                  imre: (i: n) => i === 3 ? [0, 1]: [1, 0] },
        { n:    'cx', gate: (qc: QC) => { qc.cx(0, 1);            }, s: ['00', '11', '10', '01'],                                  imre: (i: n) => [1, 0] },
        { n:  'swap', gate: (qc: QC) => { qc.swap(0, 1);          }, s: ['00', '10', '01', '11'],                                  imre: (i: n) => [1, 0] },
        { n:   'ccx', gate: (qc: QC) => { qc.ccx(0, 1, 2);        }, s: ['000', '001', '010', '111', '100', '101', '110', '011'],  imre: (i: n) => [1, 0] },
        { n:   'ccz', gate: (qc: QC) => { qc.ccz(0, 1, 2);        }, s: ['000', '001', '010', '011', '100', '101', '110', '111'],  imre: (i: n) => [i === 7 ? -1 : 1, 0] },
        { n: 'cswap', gate: (qc: QC) => { qc.cswap(0, 1, 2, '0'); }, s: ['000', '001', '100', '011', '010', '101', '110', '111'],  imre: (i: n) => [1, 0] },
    ])
        for (const [i, state] of s.entries())
        {
            const init = i.toString(2).padStart(state.length, '0');
            const [re, im] = imre(i);

            test(`.${n}() for initial state ${init}`, () =>
            {
                const qc = 
                    new QuantumCircuit(state.length)
                    .initialize(init);

                gate(qc);

                expect([...qc.statevector()]).toEqual([{ state: state, re: re, im: im }]);
            });
        }

    for (const [i, sv] of [
        [{ state: '00', re: 1, im:  0 }], 
        [{ state: '11', re: 0, im:  1 }], 
        [{ state: '10', re: 1, im:  0 }], 
        [{ state: '01', re: 0, im: -1 }]]
    .entries())
        test(`.cy() for the initial state ${i.toString(2).padStart(2, '0')}`, () =>
        {
            const qc = 
                new QuantumCircuit(2)
                .initialize(i.toString(2).padStart(2, '0'))
                .cy(0, 1);
            
            expect([...qc.statevector()]).toEqual(sv);
        });
    
    for (const [i, sv] of [
        [{ state: '00', re: 1, im: 0 }], 
        [{ state: '01', re: a, im: 0 }, { state: '11', re: a,  im: 0 }], 
        [{ state: '10', re: 1, im: 0 }], 
        [{ state: '01', re: a, im: 0 }, { state: '11', re: -a, im: 0 }]]
    .entries())
        test(`.ch() for the initial state ${i.toString(2).padStart(2, '0')}`, () =>
        {
            const qc = 
                new QuantumCircuit(2)
                .initialize(i.toString(2).padStart(2, '0'))
                .ch(0, 1);
            
            expect([...qc.statevector()]).toEqual(sv);
        });

    for (const { state, out } of [{ state: '10000', out: '11000' }, { state: '00100', out: '00100' }])
        test(`.mcx() for initial state ${state}, conditioned on |0>`, () => 
        {
            const qc = 
                new QuantumCircuit(5)
                .initialize(state)
                .mcx([0, 1, 2], 3, '000');
    
            expect([...qc.statevector()]).toEqual([ { state: out, re: 1, im: 0 }]);
        });

    test('.mcx() with target in between the controls', () =>
    {
        const qc = 
            new QuantumCircuit(4)
            .initialize('1111')
            .mcx([0, 1, 3], 2);
        
        expect([...qc.statevector()]).toEqual([{ state: '1011', re: 1, im: 0 }]);
    });

    test('Hadamard transform statevector lazy iteration', () => 
    {
        const qc = 
            new QuantumCircuit(2)
            .h(0).h(1);
        
        const states = ['00', '01', '10', '11'];

        for (const { state, re, im } of qc.statevector())
        {
            const i = states.findIndex(el => el === state);

            if (i !== -1) states.splice(i, 1);

            expect(i).not.toBe(-1);
            expect([re, im]).toEqual([0.5, 0]);
        }
    });

    for (const { order, state, sv } of [
        { order: 'First',  state: '00', sv: [{ state: '00', re: a, im: 0 }, { state: '11', re:  a, im: 0 }] },
        { order: 'Second', state: '01', sv: [{ state: '00', re: a, im: 0 }, { state: '11', re: -a, im: 0 }] },
        { order: 'Third',  state: '10', sv: [{ state: '10', re: a, im: 0 }, { state: '01', re:  a, im: 0 }] },
        { order: 'Fourth', state: '11', sv: [{ state: '10', re: a, im: 0 }, { state: '01', re: -a, im: 0 }] }
    ])
        test(`${order} Bell state`, () => 
        {
            const qc = 
                new QuantumCircuit(2)
                .initialize(state)
                .h(0)
                .cx(0, 1);

            expect([...qc.statevector()]).toEqual(sv);
        });

    test('4-qubit GHZ state', () => 
    {
        const qc = 
            new QuantumCircuit(4)
            .h(0)
            .cx(0, 1)
            .cx(1, 2)
            .cx(2, 3);

        expect([...qc.statevector()]).toEqual([
            { state: '0000', re: a, im: 0 },
            { state: '1111', re: a, im: 0 }]);
    });

    test('Hadamard-controlled NOT', () =>
    {
        const b = Math.round(a * a * 10_000) / 10_000;
        const qc = 
            new QuantumCircuit(2)
            .h(0)
            .cx(0, 1)
            .h(0);

        expect([...qc.statevector()]).toEqual([
            { state: '00', re:  b, im: 0 },
            { state: '10', re:  b, im: 0 },
            { state: '01', re:  b, im: 0 },
            { state: '11', re: -b, im: 0 }]);
    });

    test('Uncontrolled step', () =>
    {
        const qc = 
            new QuantumCircuit(5)
            .appendStep([new X(), new H(), new T(true)], [0, 1, 3]);

        expect([...qc.statevector()]).toEqual([
            { state: '00001', re: a, im: 0},
            { state: '00011', re: a, im: 0}
        ]);
    });

    for ( const { n, gate, sv } of [
        { n: 'x', gate: (qc: QC) => { qc.x([0, 1, 2]); }, sv: [{ state: '111', re: 1, im:  0 }] },
        { n: 'y', gate: (qc: QC) => { qc.y([0, 1, 2]); }, sv: [{ state: '111', re: 0, im: -1 }] },
        { n: 'z', gate: (qc: QC) => { qc.z([0, 1, 2]); }, sv: [{ state: '000', re: 1, im:  0 }] },
        { n: 's', gate: (qc: QC) => { qc.s([0, 1, 2]); }, sv: [{ state: '000', re: 1, im:  0 }] },
        { n: 't', gate: (qc: QC) => { qc.t([0, 1, 2]); }, sv: [{ state: '000', re: 1, im:  0 }] },
    ])
        test(`.${n}() with multiple indices`, () =>
        {
            const qc = 
                new QuantumCircuit(3);

            gate(qc);

            expect([...qc.statevector()]).toEqual(sv);
        });

    test('.h() with multiple indices', () =>
    {
        const qubits = 3;
        const b = Math.round((a ** qubits) * 10_000) / 10_000;

        const qc = 
            new QuantumCircuit(qubits)
            .h([...Array(qubits).keys()]);

        const states = new Map<string, number>();
        for (const el of qc.statevector())
        {
            states.set(el.state, (states.get(el.state) ?? 0) + 1);
            expect(el.im).toBe(0);
            expect(el.re).toBeCloseTo(b, 3);
        }

        expect(states.size).toBe(2 ** qubits);
        expect(Math.max(...states.values())).toBe(1);
    });
});