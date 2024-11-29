import Complex from 'complex.js';
import { Vertex, Edge, QMDD } from '../src/execution/qmdd';
import { Control, H, I, X } from '../src/circuit/gates';
import { zip } from '../src/utils/iterators';

const a = Math.sqrt(0.5);

describe("Vertex", () =>
{
    test("should be terminal for an empty call", () =>
    {
        expect(new Vertex().terminal()).toBe(true);
    });

    describe("should not be terminal when", () =>
    {
        const terminal = new Vertex();
        const v1 = new Vertex(0, [
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
        ]);
        const v2 = new Vertex(1, [
            new Edge(terminal, Complex.ZERO),
            new Edge(v1, Complex.ONE),
            new Edge(v1, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
        ]);

        test("pointing to the terminal Vertex", () =>
        {
            expect(v1.terminal()).toBe(false);
        });

        test("pointing to a Vertex which points to the terminal Vertex", () =>
        {
            expect(v2.terminal()).toBe(false);
        });
    });

    describe("should precede another Vertex when", () =>
    {
        test("it has a greater variable index", () =>
        {
            expect(new Vertex(2).precedes(new Vertex(1))).toBe(true);
        });

        test("it has an undefined variable index but the other doesn't", () =>
        {
            expect(new Vertex().precedes(new Vertex(0))).toBe(true);
        });
    });

    describe("should not precede another Vertex when", () =>
    {
        test("it has a lesser variable index", () =>
        {
            expect(new Vertex(1).precedes(new Vertex(2))).toBe(false);
        });

        test("they have the same variable index", () =>
        {
            expect(new Vertex(1).precedes(new Vertex(1))).toBe(false);
        });

        test("both of them have undefined variable indeces", () =>
        {
            expect(new Vertex().precedes(new Vertex())).toBe(false);
        });

        test("it has a defined variable index but the other doesn't", () =>
        {
            expect(new Vertex(1).precedes(new Vertex())).toBe(false);
        });
    });
});

describe("Edge", () =>
{
    describe("(when adding 0-edges together) should return an edge which", () =>
    {
        const terminal = new Vertex();

        const e0 = new Edge(terminal, Complex.ZERO);
        const e1 = new Edge(terminal, Complex.ZERO);

        const sum = e0.add(e1);

        test("points to the terminal", () =>
        {
            expect(sum.pointsTo === terminal).toBe(true);
        });

        test("has zero weight", () =>
        {
            expect(sum.weight.equals(Complex.ZERO)).toBe(true);
        });
    });

    describe("(when adding terminal edges together where one is a 0-edge) should return an edge which", () =>
    {
        const terminal = new Vertex();

        const e0 = new Edge(terminal, Complex.ZERO);
        const e1 = new Edge(terminal, Complex.ONE);

        const sum1 = e0.add(e1);
        const sum2 = e1.add(e0);

        test("has the non-0 weight", () =>
        {
            expect(sum1.weight.equals(Complex.ONE)).toBe(true);
            expect(sum2.weight.equals(Complex.ONE)).toBe(true);
        });

        test("points to the terminal", () =>
        {
            expect(sum1.pointsTo === terminal).toBe(true);
            expect(sum2.pointsTo === terminal).toBe(true);    
        });

        test("is qualitative equal to the original non-0-edge", () =>
        {
            expect(sum1).toStrictEqual(e1);
            expect(sum2).toStrictEqual(e1);
        });
    });

    test("(when adding a 0-edge and a non-terminal edge together) should return a copy of the non-terminal edge", () => 
    {
        const terminal = new Vertex();
        const x1 = new Vertex(1, [
            new Edge(terminal, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ONE),
        ]);
        const x0 = new Vertex(0, [
            new Edge(terminal, Complex.ZERO),
            new Edge(x1, Complex.ONE),
            new Edge(x1, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
        ]);

        const e0 = new Edge(x0, Complex.ONE);
        const e1 = new Edge(terminal, Complex.ZERO);

        expect(e0.add(e1)).toStrictEqual(e0);
    });

    describe("should merge compatible Verteces correctly; the output should", () =>
    {
        const terminal = new Vertex();
        const x0 = new Vertex(0, [
            new Edge(terminal, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ONE),
        ]);
        const x1 = new Vertex(0, [
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ONE),
            new Edge(terminal, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
        ]);

        const e0 = new Edge(x0, Complex.ONE);
        const e1 = new Edge(x1, Complex.ONE);
        const sum = e0.add(e1);

        test("have entry weight the product of the old entry weights", () =>
        {
            expect(sum.weight.equals(Complex.ONE)).toBe(true);
        });

        test("maintain the variable index", () =>
        {
            expect(sum.pointsTo.variable).toBe(0);
        });

        for (const [i, weight] of [Complex.ONE, Complex.ONE, Complex.ONE, Complex.ONE].entries())
            {
                test("maintain the destination of each edge", () =>
                {
                    expect(sum.pointsTo.edges[i].pointsTo === terminal).toBe(true);
                });

                test("maintain the weight of each edge", () =>
                {
                    expect(sum.pointsTo.edges[i].weight.equals(weight)).toBe(true);
                });
            }
    });

    describe("should unify pointed diagrams correctly; the output should", () =>
    {
        const terminal = new Vertex();
        const x10 = new Vertex(1, [
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ONE),
            new Edge(terminal, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
        ]);
        const x00 = new Vertex(0, [
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(x10, Complex.ONE),
        ]);
        const e0 = new Edge(x00, Complex.ONE);

        const x11 = new Vertex(1, [
            new Edge(terminal, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ONE),
        ]);
        const x01 = new Vertex(0, [
            new Edge(x11, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
        ]);
        const e1 = new Edge(x01, Complex.ONE);

        const sum = e0.add(e1);

        test("have entry weight the product of the old entry weights", () =>
        {
            expect(sum.weight.equals(Complex.ONE)).toBe(true);
        });

        test("maintain variable indeces", () =>
        {
            expect(sum.pointsTo.variable).toBe(0);
        });

        for (const [i, vertex, weight] of zip(
            [x11, terminal, terminal, x10], 
            [Complex.ONE, Complex.ZERO, Complex.ZERO, Complex.ONE], true))
        {
            test("maintain the destination of each non-terminal edge", () =>
            {
                expect(sum.pointsTo.edges[i].pointsTo === vertex).toBe(true);
            });

            test("preserve the weight of each non-terminal edge", () => 
            {
                expect(sum.pointsTo.edges[i].weight.equals(weight)).toBe(true);
            });
        }
    });

    describe("(when multiplying anything to a 0-edge) should yield the 0-edge,", () =>
    {
        const terminal = new Vertex();
        const e0 = new Edge(terminal, Complex.ZERO);
        const e1 = new Edge(terminal, Complex.ONE);
        const x = new Vertex(0, [
            new Edge(terminal, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ONE),
        ]);
        const e2 = new Edge(x, Complex.ONE);

        test("no matter the depth", () =>
        {
            expect(e0.multiply(e1)).toStrictEqual(e0);
        });

        test("no matter the order", () =>
        {
            expect(e1.multiply(e0)).toStrictEqual(e0);
        });

        test("no matter the complexity", () =>
        {
            expect(e2.multiply(e0)).toStrictEqual(e0);
        });
    });

    describe("(when multiplying a Hermitian with itself) should yield a diagram that", () => 
    {
        const terminal = new Vertex();
        const x0 = new Vertex(0, [
            new Edge(terminal, Complex(a)),
            new Edge(terminal, Complex(a)),
            new Edge(terminal, Complex(a)),
            new Edge(terminal, Complex(-a)),
        ]);
        const x1 = new Vertex(0, [
            new Edge(terminal, Complex(a)),
            new Edge(terminal, Complex(a)),
            new Edge(terminal, Complex(a)),
            new Edge(terminal, Complex(-a)),
        ]);
        const e0 = new Edge(x0, Complex.ONE);
        const e1 = new Edge(x1, Complex.ONE);
        const prod = e0.multiply(e1);

        test("has entry weight equal to 1", () =>
        {
            expect(prod.weight.equals(Complex.ONE)).toBe(true);
        });

        test("maintains variable indeces", () =>
        {
            expect(prod.pointsTo.variable).toBe(0);
        });

        test("represents the identity transform", () =>
        {
            for (const [i, weight] of [Complex.ONE, Complex.ZERO, Complex.ZERO, Complex.ONE].entries())
            {
                expect(prod.pointsTo.edges[i].pointsTo === terminal).toBe(true);
                expect(prod.pointsTo.edges[i].weight.equals(weight)).toBe(true);
            }
        });
    });

    describe("(when multiplying two QMDD steps together) should yield a QMDD which", () =>
    {
        const terminal = new Vertex();
        const x20 = new Vertex(2, [
            new Edge(terminal, Complex(a)),
            new Edge(terminal, Complex(a)),
            new Edge(terminal, Complex(a)),
            new Edge(terminal, Complex(-a)),
        ]);
        const x10 = new Vertex(1, [
            new Edge(x20, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(x20, Complex.ONE),
        ]);
        const x00 = new Vertex(0, [
            new Edge(x10, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(x10, Complex.ONE),
        ]);
        const e0 = new Edge(x00, Complex.ONE);

        const x21a = new Vertex(2, [
            new Edge(terminal, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
        ]);
        const x21b = new Vertex(2, [
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ONE),
        ]);
        const x11 = new Vertex(1, [
            new Edge(x21a, Complex.ONE),
            new Edge(x21b, Complex.ONE),
            new Edge(x21b, Complex.ONE),
            new Edge(x21a, Complex.ONE),
        ]);
        const x01 = new Vertex(0, [
            new Edge(x11, Complex.ONE),
            new Edge(terminal, Complex.ZERO),
            new Edge(terminal, Complex.ZERO),
            new Edge(x11, Complex.ONE),
        ]);
        const e1 = new Edge(x01, Complex.ONE);

        const prod = e0.multiply(e1);
        const x0 = prod.pointsTo;
        const x1 = x0.edges[0].pointsTo;
        const x2a = x1.edges[0].pointsTo;
        const x2b = x1.edges[1].pointsTo;

        test("has entry weight the product of the old entry weights", () =>
        {
            expect(prod.weight.equals(Complex.ONE)).toBe(true);
        });

        test("maintains variable indeces", () =>
        {
            expect(x0.variable).toBe(0);
            expect(x1.variable).toBe(1);
            expect(x2a.variable).toBe(2);
            expect(x2b.variable).toBe(2);
        });

        describe("preserves the destinations of Edges that are identical in both diagrams:", () =>
        {
            test("\nThe non-diagonal edges of InertiaGate should point to the terminal", () =>
            {
                expect(x0.edges[1].pointsTo === terminal).toBe(true);
                expect(x0.edges[2].pointsTo === terminal).toBe(true);    
            });

            test("\nThe diagonal edges of InertiaGate should point to the same Vertex", () =>
            {
                expect(x0.edges[0].pointsTo === x0.edges[3].pointsTo).toBe(true); // this fails
            });
        });

        test("preserves the weights of Edges that are identical in both diagrams", () =>
        {
            for (const [i, weight] of [Complex.ONE, Complex.ZERO, Complex.ZERO, Complex.ONE].entries())
                expect(x0.edges[i].weight.equals(weight)).toBe(true);    
        });

        describe("merges compatible Verteces correctly:", () =>
        {
            test("\nThe diagonal Edges should point to the same Vertex", () =>
            {
                expect(x1.edges[0].pointsTo === x1.edges[3].pointsTo).toBe(true); // this fails
            });

            test("\nThe non-diagonal Edges should point to the same Vertex", () =>
            {
                expect(x1.edges[1].pointsTo === x1.edges[2].pointsTo).toBe(true); // this fails
            });

            test("\nAll Edges should have weight equal to 1", () =>
            {
                for(let i = 0; i < 4; i++)
                    expect(x1.edges[i].weight.equals(Complex.ONE)).toBe(true);    
            });
        });

        test("multiplies the Edges of foreign Verteces correctly", () =>
        {
            for (const [vertex, weights] of [
                [x2a, [Complex(a), Complex(a), Complex.ZERO, Complex.ZERO]],
                [x2b, [Complex.ZERO, Complex.ZERO, Complex(a), Complex(-a)]]
                ])
                for (const [i, weight] of (weights as Complex[]).entries())
                {
                    expect((vertex as Vertex).edges[i].pointsTo === terminal).toBe(true);
                    expect((vertex as Vertex).edges[i].weight.equals(weight)).toBe(true);
                }
        });
    });
});

describe("QMDD", () =>
{
    describe("should throw for", () =>
    {
        test("invalid constructor input type", () =>
        {
            // @ts-expect-error
            expect(() => { new QMDD('lmaoo'); })
            .toThrow("Invalid input type in QMDD (expected Gate[][]).");
        });

        describe("invalid decimal value in .evaluate():", ()=>
        {
            test("\nNon-numerical input", () =>
            {
                // @ts-expect-error
                expect(() => { [...new QMDD([]).evaluate('lmaoo')]; })
                .toThrow("Invalid input type in QMDD.evaluate (expected an integer in [0, 10], got lmaoo).")
            })

            test("\nNegative value", () =>
            {
                expect(() => { [...new QMDD([]).evaluate(-1)]; })
                .toThrow("Invalid input type in QMDD.evaluate (expected an integer in [0, 10], got -1).")
            });

            test("\nFloat value", () =>
            {
                expect(() => { [...new QMDD([]).evaluate(0.5)]; })
                .toThrow("Invalid input type in QMDD.evaluate (expected an integer in [0, 10], got 0.5).")
            });

            test("\nToo big a value", () =>
            {
                expect(() => { [...new QMDD([]).evaluate(11)]; })
                .toThrow("Invalid input type in QMDD.evaluate (expected an integer in [0, 10], got 11).")
            });
        });
    });

    describe("(when building an uncontrolled step) should yield a QMDD which", () =>
    {
        const step = new QMDD([[
            new X(),
            new H(),
            new I(),
        ]]);

        const x0 = step.entry.pointsTo;
        const x1 = x0.edges[1].pointsTo;
        const x2 = x1.edges[0].pointsTo;
        const terminal = x2.edges[0].pointsTo;

        test("has entry weight equal to 1", () =>
        {
            expect(step.entry.weight.equals(Complex.ONE)).toBe(true);
        });

        test("has a terminal vertex at the correct depth", () =>
        {
            expect(terminal.terminal()).toBe(true);
        });

        describe("appoints Edge destinations according to each Gate's matrix:", () =>
        {
            test("\nThe XGate Vertex should connect to the next Vertex by the non-diagonals", () =>
            {
                for (const [i, vertex] of [terminal, x1, x1, terminal].entries())
                    expect(x0.edges[i].pointsTo === vertex).toBe(true);    
            });

            test("\nThe HGate Vertex should connect to the next Vertex by all its edges", () =>
            {
                for (let i = 0; i < 4; i++)
                    expect(x1.edges[i].pointsTo === x2).toBe(true);        
            });

            test("\nThe final Vertex should point to the terminal", () =>
            {
                for (let i = 0; i < 4; i++)
                    expect(x2.edges[i].pointsTo === terminal).toBe(true);
            });
        });

        describe("appoints Edge weights according to each Gate's matrix:", () => 
        {
            test("\nThe XGate Vertex should have weights [0, 1, 1, 0]", () =>
            {
                for (const [i, weight] of [Complex.ZERO, Complex.ONE, Complex.ONE, Complex.ZERO].entries())
                    expect(x0.edges[i].weight.equals(weight)).toBe(true);                
            });

            test("\nThe HGate Vertex should have weights [a, a, a, -a]", () =>
            {
                for (let i = 0; i < 3; i++)
                    expect(x1.edges[i].weight.equals(Complex(a))).toBe(true);
                expect(x1.edges[3].weight.equals(Complex(-a))).toBe(true);        
            });

            test("\nThe InertiaGate Vertex should have weights [1, 0, 0, 1]", () =>
            {
                for (const [i, weight] of [Complex.ONE, Complex.ZERO, Complex.ZERO, Complex.ONE].entries())
                    expect(x2.edges[i].weight.equals(weight)).toBe(true);
            });
        });
    });

    describe("(when building a CNOT with the control on the top) should yield a QMDD which", () =>
    {
        const cnot = new QMDD([[new Control(), new X()]]);

        const x0 = cnot.entry.pointsTo;
        const x1a = x0.edges[0].pointsTo;
        const x1b = x0.edges[3].pointsTo;
        const terminal = x1a.edges[0].pointsTo;

        test("has entry weight equal to 1", () =>
        {
            expect(cnot.entry.weight.equals(Complex.ONE));
        });

        test("has a terminal Vertex at the correct depth", () =>
        {
            expect(terminal.terminal()).toBe(true);
        });

        test("doesn't overrecycle Verteces", () =>
        {
            expect(x1a === x1b).toBe(false);
            expect(x1a === x0).toBe(false);
            expect(x0  === terminal).toBe(false);    
        });

        describe("points to the active part by the activation edge:", () =>
        {
            test("\nThe active part's entry weight should be 1", () =>
            {
                expect(x0.edges[3].weight.equals(Complex.ONE)).toBe(true);
            });

            test("\nThe weights should follow the Gate's matrix", () => 
            {
                for (const [i, weight] of [Complex.ZERO, Complex.ONE, Complex.ONE, Complex.ZERO].entries())
                    expect(x1b.edges[i].weight.equals(weight)).toBe(true);
            });

            test("\nAll edges should point to the terminal", () =>
            {
                for (let i = 0; i < 4; i++)
                    expect(x1b.edges[i].pointsTo === terminal).toBe(true);
            });
        });

        describe("points to the inactive part by the off-activation edge:", () =>
        {
            test("\nThe inactive part's entry weight should be 1", () =>
            {
                expect(x0.edges[0].weight.equals(Complex.ONE)).toBe(true);
            });

            test("\nThe weights should follow the identity matrix", () => 
            {
                for (const [i, weight] of [Complex.ONE, Complex.ZERO, Complex.ZERO, Complex.ONE].entries())
                    expect(x1a.edges[i].weight.equals(weight)).toBe(true);
            });

            test("\nAll edges should point to the terminal", () =>
            {
                for (let i = 0; i < 4; i++)
                    expect(x1a.edges[i].pointsTo === terminal).toBe(true);
            });
        });

        describe("nullifies non-diagonal edges:", () =>
        {
            test("\nThey should point to the terminal", () =>
            {
                expect(x0.edges[1].pointsTo === terminal).toBe(true);
                expect(x0.edges[2].pointsTo === terminal).toBe(true);
            });

            test("\nThey should have zero weight", () =>
            {
                expect(x0.edges[1].weight.equals(Complex.ZERO)).toBe(true);
                expect(x0.edges[2].weight.equals(Complex.ZERO)).toBe(true);
            });
        });
    });

    describe("(when building a CNOT with the control on the bottom) should yield a QMDD which", () =>
    {
        const cnot = new QMDD([[new X(), new Control(true)]]);

        const x0 = cnot.entry.pointsTo;
        const x1a = x0.edges[1].pointsTo;
        const x1b = x0.edges[0].pointsTo;
        const terminal = x1a.edges[0].pointsTo;

        test("has entry weight equal to 1", () =>
        {
            expect(cnot.entry.weight.equals(Complex.ONE));
        });

        test("has a terminal Vertex at the correct depth", () =>
        {
            expect(terminal.terminal()).toBe(true);
        });

        test("doesn't overrecycle Verteces", () =>
        {
            expect(x1a === x1b).toBe(false);
            expect(x1a === x0).toBe(false);
            expect(x0  === terminal).toBe(false);    
        });

        describe("points to the inactive part", () =>
        {
            test("with the diagonal edges", () =>
            {
                for (const i of [0, 3])
                {
                    expect(x0.edges[i].pointsTo === x1b).toBe(true);
                    expect(x0.edges[i].weight.equals(Complex.ONE)).toBe(true);
                }
            });

            test("which has flipped controlled weights", () =>
            {
                for (const [i, weight] of [Complex.ZERO, Complex.ZERO, Complex.ZERO, Complex.ONE].entries())
                    expect(x1b.edges[i].weight.equals(weight)).toBe(true);
            });

            test("which points to the terminal", () =>
            {
                for (let i = 0; i < 4; i++)
                    expect(x1b.edges[i].pointsTo === terminal).toBe(true);
            });
        });

        describe("points to the active part", () =>
        {
            test("with the off-diagonal edges", () =>
            {
                for (const i of [1, 2])
                {
                    expect(x0.edges[i].pointsTo === x1a).toBe(true);
                    expect(x0.edges[i].weight.equals(Complex.ONE)).toBe(true);
                }
            });

            test("which has expected controlled weights", () =>
            {
                for (const [i, weight] of [Complex.ONE, Complex.ZERO, Complex.ZERO, Complex.ZERO].entries())
                    expect(x1a.edges[i].weight.equals(weight)).toBe(true);
            });

            test("which points to the terminal", () =>
            {
                for (let i = 0; i < 4; i++)
                    expect(x1a.edges[i].pointsTo === terminal).toBe(true);
            });
        });
    });

    describe("(when building a mix-controlled Toffoli with the target in the middle) should yield a QMDD which", () => 
    {
        const toffoli = new QMDD([[new Control(), new X(), new Control(true)]]);

        const x0 = toffoli.entry.pointsTo;
        const x1a = x0.edges[0].pointsTo;
        const x1b = x0.edges[3].pointsTo;
        const x2a = x1a.edges[0].pointsTo;
        const x2b = x1b.edges[1].pointsTo;
        const x2c = x1b.edges[0].pointsTo;
        const terminal = x2a.edges[0].pointsTo;

        test("has a terminal Vertex in the correct depth", () =>
        {
            expect(terminal.terminal()).toBe(true);
        });

        test("doesn't overrecycle Verteces", () =>
        {
            expect(x1a === x1b).toBe(false);
            expect(x2a === x2b || x2a === x2c || x2b === x2c).toBe(false);
        });

        test("nullifies the non-diagonal edges", () =>
        {
            for (const i of [1, 2])
            {
                expect(x0.edges[i].pointsTo === terminal).toBe(true);
                expect(x0.edges[i].weight.equals(Complex.ZERO)).toBe(true);    
            }
        });

        describe("points to the identity branch for the off-activation edge on the first control:", () =>
        {
            test("\nThe identity branch's entry weight should be 1", () =>
            {
                expect(x0.edges[0].weight.equals(Complex.ONE)).toBe(true);
            });

            describe("\nThe branch should sink to the terminal through identity Verteces:", () =>
            {
                for (const [v, next] of [[x1a, x2a], [x2a, terminal]])
                {
                    test("\nEach participant of the identity branch should point to the next participant or the terminal", () =>
                    {
                        expect(v.edges[0].pointsTo === next).toBe(true);
                        expect(v.edges[1].pointsTo === terminal).toBe(true);
                        expect(v.edges[2].pointsTo === terminal).toBe(true);
                        expect(v.edges[3].pointsTo === next).toBe(true);
                    });

                    test("\nEach participant of the identity branch should have identity weights", () =>
                    {
                        for (const [i, weight] of [Complex.ONE, Complex.ZERO, Complex.ZERO, Complex.ONE].entries())
                            expect(v.edges[i].weight.equals(weight)).toBe(true);
                    });
                }
            });
        });

        describe("points to the active QMDD for the activation edge on the first control:", () =>
        {
            test("\nThe main branch's entry weight should be 1", () =>
            {
                expect(x0.edges[3].weight.equals(Complex.ONE)).toBe(true);
            });

            test("\nThe non-diagonal edges of the main branch should point to the active part", () =>
            {
                for (const i of [1, 2])
                {
                    expect(x1b.edges[i].pointsTo === x2b).toBe(true);
                    expect(x1b.edges[i].weight.equals(Complex.ONE)).toBe(true);
                }

                for (const [i, weight] of [Complex.ONE, Complex.ZERO, Complex.ZERO, Complex.ZERO].entries())
                {
                    expect(x2b.edges[i].pointsTo === terminal).toBe(true);
                    expect(x2b.edges[i].weight.equals(weight)).toBe(true);
                }
            });

            test("\nThe diagonal edges of the main branch should point to the inactive part", () =>
            {
                for (const i of [0, 3])
                {
                    expect(x1b.edges[i].pointsTo === x2c).toBe(true);
                    expect(x1b.edges[i].weight.equals(Complex.ONE)).toBe(true);
                }

                for (const [i, weight] of [Complex.ZERO, Complex.ZERO, Complex.ZERO, Complex.ONE].entries())
                {
                    expect(x2c.edges[i].pointsTo === terminal).toBe(true);
                    expect(x2c.edges[i].weight.equals(weight)).toBe(true);
                }
            });
        });
    }); 
});