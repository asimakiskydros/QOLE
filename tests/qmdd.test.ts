import { Complex } from "../src/complex";
import { H, I, S, T, X } from "../src/gates";
import { Edge, QMDD } from "../src/qmdd";

describe('QMDD: ', () =>
{
    describe('Normalization: ', () =>
    {
        const c1 = new Complex(1, 0, 0, 0, 3).index;
        const c2 = new Complex(2, 0, 0, 0, 3).index;
        const c3 = new Complex(2, 0, 0, 0, 1).index;
        const c4 = new Complex(1, 0, 0, 0, 2).index;
        const ter = QMDD.createTerminal(1);
        const edges: Edge[] = [
            { dest: ter, weight: 0  },
            { dest: ter, weight: c1 },
            { dest: ter, weight: 0  },
            { dest: ter, weight: c2 },
        ];

        for (const { i, ew, e1, e2 } of [
            { i: 1, ew: c1, e1: 1, e2: c3 },
            { i: 3, ew: c2, e1: c4, e2: 1 }
        ]) {
            const e = QMDD.createVertex(0, edges, ter, i as (1 | 3));
            
            test(`Rule #${i}: entry weight`, () =>
            {
                expect(e.weight).toBe(ew);
            });

            test(`Rule #${i}: edge weights`, () =>
            {
                expect(e.dest.edges.map(d => d.weight)).toEqual([0, e1, 0, e2])
            });

            test(`Rule #${i}: edge destinations`, () =>
            {
                for (const d of e.dest.edges) expect(d.dest).toBe(ter);
            });
        }
    });

    test('Vertices get recycled', () =>
    {
        const ter = QMDD.createTerminal(1);
        const edges: Edge[] = [
            { dest: ter, weight: 0 },
            { dest: ter, weight: Complex.NEG_I },
            { dest: ter, weight: Complex.I },
            { dest: ter, weight: 0 },
        ];
        const y0 = QMDD.createVertex(0, edges, ter);
        const y1 = QMDD.createVertex(0, edges, ter);

        expect(y0.weight).toBe(y1.weight);
        expect(y0.dest).toBe(y1.dest);
    });

    test('Redundant Vertices get eliminated', () =>
    {
        const ter = QMDD.createTerminal(1);
        const edges: Edge[] = [
            { dest: ter, weight: Complex.I },
            { dest: ter, weight: Complex.I },
            { dest: ter, weight: Complex.I },
            { dest: ter, weight: Complex.I },
        ];
        const y = QMDD.createVertex(0, edges, ter);

        expect(y.weight).toBe(Complex.I);
        expect(y.dest).toBe(ter);
    });

    test('Identity Vertices (up to a scalar) get eliminated', () =>
    {
        const ter = QMDD.createTerminal(1);
        const edges: Edge[] = [
            { dest: ter, weight: Complex.A },
            { dest: ter, weight: 0 },
            { dest: ter, weight: 0 },
            { dest: ter, weight: Complex.A },
        ];
        const y = QMDD.createVertex(0, edges, ter);

        expect(y.weight).toBe(Complex.A);
        expect(y.dest).toBe(ter);
    });

    describe('Construct: ', () => 
    {
        test('Empty circuit', () =>
        {
            const qubits = 4;
            const ter = QMDD.createTerminal(qubits);
            let e = QMDD.groundState(ter);

            for (let i = 0; i < qubits; i++)
                e = QMDD.multiply(QMDD.construct(new I(), i, [], ter), e, ter);

            expect(e.weight).toBe(1);

            for (let i = 0; i < qubits; i++)
            {
                expect(e.dest.edges.map(d => d.weight)).toEqual([1, 0]);
                e = e.dest.edges[0];
            }

            expect(e.dest.isTerminal()).toBe(true);
        });

        describe('Uncontrolled step: ', () =>
        {
            const step = [
                { operator: new X(), target: 0 },
                { operator: new H(), target: 1 },
                { operator: new S(), target: 2 },
            ];
            const qubits = step.length;
            const ter = QMDD.createTerminal(qubits);
            let e = QMDD.multiply(QMDD.uncontrolledStep(step, ter), QMDD.groundState(ter), ter);

            test('First level', () =>
            {
                // NOT level (vectorized)
                expect(e.weight).toBe(Complex.A);  // ballooned from the Hadamard just below
                expect(e.dest.edges.map(d => d.dest.isTerminal())).toEqual([true, false]);
                expect(e.dest.edges.map(d => d.weight)).toEqual([0, 1]);
            });
            test('Second level', () =>
            {
                // Hadamard level (vectorized)
                e = e.dest.edges[1];
                expect(e.dest.edges.map(d => d.dest.isTerminal())).toEqual([false, false]);
                expect(e.dest.edges.map(d => d.weight)).toEqual([1, 1]);
                expect(e.dest.edges[0].dest).toBe(e.dest.edges[1].dest);
            });
            test('Third level', () =>
            {
                // S level (vectorized)
                e = e.dest.edges[0];
                expect(e.dest.edges.map(d => d.dest.isTerminal())).toEqual([true, true]);
                expect(e.dest.edges.map(d => d.weight)).toEqual([1, 0]);
            });
        });

        describe('CNOT with the control preceding: ', () =>
        {
            const qubits = 2;
            const ter = QMDD.createTerminal(qubits);
            const posctrl = QMDD.construct(new X(), 1, [{ index: 0, state: '1' }], ter);
            const negctrl = QMDD.construct(new X(), 1, [{ index: 0, state: '0' }], ter);

            for (const { n, dd, a, i, w } of [
                { n: 'Positive control', dd: posctrl, a: [true, true, true, false], i: 3, w: [1, 0] },
                { n: 'Negative control', dd: negctrl, a: [false, true, true, true], i: 0, w: [0, 1] }
            ])
            {
                describe(`${n}: As matrix: `, () =>
                {
                    test('First level', () =>
                    {
                        expect(dd.weight).toBe(1);
                        expect(dd.dest.edges.map(d => d.dest.isTerminal())).toEqual(a);
                        expect(dd.dest.edges.map(d => d.weight)).toEqual([1, 0, 0, 1]);
                    });
                    test('Second level', () =>
                    {
                        const lvl2 = dd.dest.edges[i];

                        expect(lvl2.dest.edges.map(d => d.dest.isTerminal())).toEqual([true, true, true, true]);
                        expect(lvl2.dest.edges.map(d => d.weight)).toEqual([0, 1, 1, 0]);
                    });
                });
                describe(`${n}: As vector: `, () =>
                {
                    const e = QMDD.multiply(dd, QMDD.groundState(ter), ter);

                    test('First level', () =>
                    {
                        expect(e.weight).toBe(1);
                        expect(e.dest.edges.map(d => d.dest.isTerminal())).toEqual([false, true]);
                        expect(e.dest.edges.map(d => d.weight)).toEqual([1, 0]);
                    });
                    test('Second level', () =>
                    {
                        const lvl2 = e.dest.edges[0];

                        expect(lvl2.dest.edges.map(d => d.dest.isTerminal())).toEqual([true, true]);
                        expect(lvl2.dest.edges.map(d => d.weight)).toEqual(w);
                    });
                });
            }   
        });

        describe('CNOT with the control succeeding: ', () =>
        {
            const qubits = 2;
            const ter = QMDD.createTerminal(qubits);
            const posctrl = QMDD.construct(new X(), 0, [{ index: 1, state: '1' }], ter);
            const negctrl = QMDD.construct(new X(), 0, [{ index: 1, state: '0' }], ter);

            for (const { n, dd, a, b, w, i } of [
                { n: 'Positive control', dd: posctrl, a: [1, 0, 0, 0], b: [0, 0, 0, 1], w: [1, 0], i: 0 },
                { n: 'Negative control', dd: negctrl, a: [0, 0, 0, 1], b: [1, 0, 0, 0], w: [0, 1], i: 1 },
            ])
            {
                describe(`${n}: As matrix: `, () =>
                {
                    test('First level', () =>
                    {
                        expect(dd.weight).toBe(1);
                        expect(dd.dest.edges.map(d => d.dest.isTerminal())).toEqual([false, false, false, false]);
                        expect(dd.dest.edges.map(d => d.weight)).toEqual([1, 1, 1, 1]);
                        expect(dd.dest.edges[1].dest).toBe(dd.dest.edges[2].dest);
                        expect(dd.dest.edges[0].dest).toBe(dd.dest.edges[3].dest);
                        expect(dd.dest.edges[0].dest).not.toBe(dd.dest.edges[1].dest);
                    });
                    test('Second level', () =>
                    {
                        const left = dd.dest.edges[0];
                        const right = dd.dest.edges[1];

                        expect(left.dest.edges.map(d => d.dest.isTerminal())).toEqual([true, true, true, true]);
                        expect(right.dest.edges.map(d => d.dest.isTerminal())).toEqual([true, true, true, true]);
                        expect(left.dest.edges.map(d => d.weight)).toEqual(a);
                        expect(right.dest.edges.map(d => d.weight)).toEqual(b);
                    });
                });
                describe(`${n}: As vector: `, () =>
                {
                    const e = QMDD.multiply(dd, QMDD.groundState(ter), ter);

                    test('First level', () =>
                    {
                        expect(e.weight).toBe(1);
                        expect(e.dest.edges.map(d => d.dest.isTerminal())).toEqual(w.map(ww => ww === 0))
                        expect(e.dest.edges.map(d => d.weight)).toEqual(w);
                    });
                    test('Second level', () =>
                    {
                        const lvl2 = e.dest.edges[i];

                        expect(lvl2.dest.edges.map(d => d.dest.isTerminal())).toEqual([true, true]);
                        expect(lvl2.dest.edges.map(d => d.weight)).toEqual([1, 0]);
                    });
                });
            }
        });

        describe('CCHadamard with the controls both preceding and succeeding: ', () =>
        {
            const qubits = 3;
            const ter  = QMDD.createTerminal(qubits);
            const og = QMDD.construct(new H(), 1, [{ index: 2, state: '1' }, { index: 0, state: '0' }], ter);
            let dd = og;

            test('First level', () =>
            {
                expect(dd.weight).toBe(1);
                expect(dd.dest.edges.map(d => d.dest.isTerminal())).toEqual([false, true, true, true]);
                expect(dd.dest.edges.map(d => d.weight)).toEqual([1, 0, 0, 1]);
            });
            test('Second level', () => 
            {
                dd = og.dest.edges[0];
                expect(dd.dest.edges.map(d => d.dest.isTerminal())).toEqual([false, false, false, false]);
                expect(dd.dest.edges.map(d => d.weight)).toEqual([1, Complex.A, Complex.A, 1]);
                expect(dd.dest.edges[1].dest).toBe(dd.dest.edges[2].dest);
                expect(dd.dest.edges[0].dest).not.toBe(dd.dest.edges[1].dest);
                expect(dd.dest.edges[0].dest).not.toBe(dd.dest.edges[3].dest);
                expect(dd.dest.edges[1].dest).not.toBe(dd.dest.edges[3].dest);
            });
            test('Third level', () =>
            {
                const first = dd.dest.edges[0];
                const second = dd.dest.edges[1];
                const third = dd.dest.edges[3];

                for (const dag of [first, second, third])
                    expect(dag.dest.edges.map(d => d.dest.isTerminal())).toEqual([true, true, true, true]);

                for (const dag of [first, third])
                    expect(dag.dest.edges.map(d => d.weight)).toEqual([1, 0, 0, dag === third ? Complex.NEG_A : Complex.A]);

                expect(second.dest.edges.map(d => d.weight)).toEqual([0, 0, 0, 1]);
            });
            describe('As vector resulting from |0>: ', () =>
            {
                let e = QMDD.multiply(og, QMDD.groundState(ter), ter);

                // due to Jest shenanigans I cannot simplify this with a loop :-|
                test('First level', () =>
                {
                    expect(e.weight).toBe(1);
                    expect(e.dest.edges.map(d => d.dest.isTerminal())).toEqual([false, true]);
                    expect(e.dest.edges.map(d => d.weight)).toEqual([1, 0]);
                });
                test('Second level', () =>
                {
                    e = e.dest.edges[0];

                    expect(e.dest.edges.map(d => d.dest.isTerminal())).toEqual([false, true]);
                    expect(e.dest.edges.map(d => d.weight)).toEqual([1, 0]);
                });
                test('Third level', () =>
                {
                    e = e.dest.edges[0];

                    expect(e.dest.edges.map(d => d.dest.isTerminal())).toEqual([true, true]);
                    expect(e.dest.edges.map(d => d.weight)).toEqual([1, 0]);
                });
            });
        });

        describe('Hadamard-CNOT: ', () =>
        {
            const ter = QMDD.createTerminal(2);
            let dd = QMDD.groundState(ter);  // |00>
                dd = QMDD.multiply(QMDD.construct(new H(), 0, [], ter), dd, ter);  // (H@I)|00>
                dd = QMDD.multiply(QMDD.construct(new X(), 1, [{ index: 0, state: '1' }], ter), dd, ter);  // CX(H@I)|00>

            test('Entry weight is 1/sqrt(2)', () =>
            {
                expect(dd.weight).toBe(Complex.A);
            });

            test('First level', () =>
            {
                expect(dd.dest.edges[0].dest).not.toBe(dd.dest.edges[1].dest);
                expect(dd.dest.edges[0].weight * dd.dest.edges[1].weight).toBe(1);  // both need to have weight 1
            });

            test('Second level', () =>
            {
                const vl = dd.dest.edges[0].dest;
                const vr = dd.dest.edges[1].dest;

                expect([vl.edges[1], vr.edges[0]]).toEqual([{ dest: ter, weight: 0 }, { dest: ter, weight: 0 }]);
                expect([vl.edges[0], vr.edges[1]]).toEqual([{ dest: ter, weight: 1 }, { dest: ter, weight: 1 }]);
            });
        });
    });

    describe('Strong simulation: ', () =>
    {
        test('Trying to simulate a zero-edge', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e: Edge = { dest: ter, weight: 0 };

            expect(() => { [...QMDD.strongSimulate(e, 4)]; }).toThrow(`Error in QMDD.strongSimulate(): The passed entry is a zero edge.`);
        });

        test('Trying to simulate a terminal edge', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e: Edge = { dest: ter, weight: 123 };

            expect(() => { [...QMDD.strongSimulate(e, 4)]; }).toThrow(`Error in QMDD.strongSimulate(): The passed entry is a terminal edge.`);
        });
    });

    describe('Weak simulation: ', () =>
    {
        test('Trying to simulate a zero-edge', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e: Edge = { dest: ter, weight: 0 };

            expect(() => { QMDD.weakSimulate(e, 1, Math.random); }).toThrow(`Error in QMDD.weakSimulate(): The passed entry is a zero edge.`);
        });

        test('Trying to simulate a terminal edge', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e: Edge = { dest: ter, weight: 123 };

            expect(() => { QMDD.weakSimulate(e, 1, Math.random); }).toThrow(`Error in QMDD.weakSimulate(): The passed entry is a terminal edge.`);
        });
    });

    describe('Addition: ', () =>
    {
        test('Sums are cached', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e0 = QMDD.construct(new X(), 0, [], ter);
            const e1 = QMDD.construct(new H(), 0, [], ter);
            const sum1 = QMDD.add(e0, e1, ter);
            const sum2 = QMDD.add(e0, e1, ter);

            expect(sum1).toStrictEqual(sum2);
        });

        test('Commutativity is respected', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e0 = QMDD.construct(new X(), 0, [], ter);
            const e1 = QMDD.construct(new H(), 0, [], ter);
            const sum1 = QMDD.add(e0, e1, ter);
            const sum2 = QMDD.add(e1, e0, ter);

            expect(sum1).toStrictEqual(sum2);
        });

        test('Zero-edges are the neutral element', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e0 = { dest: ter, weight: 0 };
            const e1 = QMDD.construct(new H(), 0, [], ter);
            const sum = QMDD.add(e0, e1, ter);
            
            expect(e1.dest).toBe(sum.dest);
            expect(e1.weight).toBe(sum.weight);
        });

        test('Adding an element to itself', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e0 = QMDD.construct(new X(), 0, [], ter);
            const e1 = QMDD.construct(new X(), 0, [], ter);
            const sum = QMDD.add(e0, e1, ter);

            expect(sum.dest).toBe(e0.dest);
            expect(sum.weight).toBe(Complex.add(1, 1));
        });
    });

    describe('Multiplication: ', () =>
    {
        test('Products are cached', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e0 = QMDD.construct(new X(), 0, [], ter);
            const e1 = QMDD.construct(new H(), 0, [], ter);
            const prod1 = QMDD.multiply(e0, e1, ter);
            const prod2 = QMDD.multiply(e0, e1, ter);

            expect(prod1).toStrictEqual(prod2);
        });

        test('Zero edges are the nullifying element', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e0 = { dest: ter, weight: 0 };
            const e1 = QMDD.construct(new H(), 0, [], ter);
            const prod = QMDD.multiply(e0, e1, ter);

            expect(prod).toEqual({ dest: ter, weight: 0 });
        });

        test('One-edges are the neutral element', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e0 = { dest: ter, weight: 1 };
            const e1 = QMDD.construct(new H(), 0, [], ter);
            const prod = QMDD.multiply(e0, e1, ter);
            
            expect(e1.dest).toBe(prod.dest);
            expect(e1.weight).toBe(prod.weight);
        });

        test('Multiplying by a scaled identity', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e0 = { dest: ter, weight: Complex.I };
            const e1 = QMDD.construct(new H(), 0, [], ter);
            const prod = QMDD.multiply(e0, e1, ter);
            
            expect(prod.dest).toBe(e1.dest);
            expect(prod.weight).toBe(Complex.mul(Complex.I, Complex.A));
            expect(prod.dest.edges.map(d => d.dest)).toEqual([ter, ter, ter, ter]);
            expect(prod.dest.edges.map(d => d.weight)).toEqual([1, 1, 1, Complex.NEG_ONE]);
        });

        test('Multiplying a Hermitian with itself', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e0 = QMDD.construct(new H(), 0, [], ter);
            const e1 = QMDD.construct(new H(), 0, [], ter);
            const prod = QMDD.multiply(e0, e1, ter);

            expect(prod.weight).toBe(1);
            expect(prod.dest.edges.map(d => d.dest)).toEqual([ter, ter]);
            expect(prod.dest.edges.map(d => d.weight)).toEqual([1, 0]);
        });

        test('Multiplying a non-Hermitian with its dagger', () =>
        {
            const ter = QMDD.createTerminal(1);
            const e0 = QMDD.construct(new T(), 0, [], ter);
            const e1 = QMDD.construct(new T(true), 0, [], ter);
            const prod = QMDD.multiply(e0, e1, ter);

            expect(prod.weight).toBe(1);
            expect(prod.dest.edges.map(d => d.dest)).toEqual([ter, ter]);
            expect(prod.dest.edges.map(d => d.weight)).toEqual([1, 0]);
        });
    });
});