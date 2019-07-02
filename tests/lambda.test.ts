import * as L from '../src/lambda';

const interpret = (s: string) => L.print(L.evaluate(L.parse(s)));

const ap = <T extends {}>(a: L.expression<T>, b: L.expression<T>) => new L.Application<T>(a, b);
const l = <T extends {}>(head: L.name, body: L.expression<T>) => new L.Lambda<T>(head, body);

describe('evaluate', function() {
    it("beta reduces `(\\x.x)y` to `y`", function() {
        let result = L.evaluate(new L.Application(new L.Lambda('x', 'x'), 'y'));
        expect(result).toBe('y');
    });

    it("applies succ to zero to get one", function() {
        expect(interpret(L.succ + L.zero))
            .toBe("\\y.\\x.yx");
    })

    it("maintains alpha-equivalence", function() {
        expect(interpret("(\\x.\\y.x)y")).not.toBe("\\y.y");
    })

    it("multiplies this properly: ", function() {
        expect(interpret("(\\nmh.n(mh))(\\fx.f(f(fx)))(\\gy.g(g(g(gy))))"))
            .toBe("\\h.\\x.h(h(h(h(h(h(h(h(h(h(h(hx)))))))))))")
    })
})

describe('DepthFirst', function() {
    let t

    it("acts as identity when forward is iterated until it returns false", function() {
        let input1 = L.succ + L.zero;
        let parsed = L.parse(input1) as L.Application;
        t = new L.DepthFirst(parsed);
        let done = true;
        while (!done) {
            done = t.forward();
        }

        expect(t.current).toMatchObject(parsed);
    })

    it("visits everything not contained within further lambdas",
       function() {
           let input2 = "(\\a.a\\z.z)b(\\c.cy)de"
           let parsed = L.parse(input2);
           t = new L.DepthFirst(parsed);
           let visited: L.name[] = [];
           let done = false;

           while (!done) {
               if (t.current instanceof L.Lambda) {
                   visited.push(t.current.head);
               } else if (typeof t.current == "string") {
                   visited.push(t.current);
               }
               done = t.forward();
           }

           visited.sort()
           expect(visited).toMatchObject(['a','b','c','d','e']);
       })
})

describe('Traverser', function() {
    it("mutates overall expression when current is set", function() {
        let input = L.succ + L.zero;
        let parsed = L.parse(input) as L.Application;
        let t = new L.Traverser(parsed);
        t.left();
        let bound = L.bind(t.current as L.Lambda, t.rightSibling as L.expression);
        t.current = bound;

        t.up();
        let result = t.current as L.Application;
        expect(result.a).toMatchObject(bound);
        expect(parsed.a).toMatchObject(bound);
    });
});

describe('bind', function() {
    it("uses lexical scoping", function() {
        let input = L.parse("\\x.((x(\\x.x))x)");

        let result = L.print(L.bind(input as L.Lambda, 'y'));
        let expected = "(y(\\x.x))y"
        expect(result).toBe(expected);
    });
});

describe('parse', function() {
    it("uncurries `\\xy.xy` to `\\x.(\\y.xy)`", function() {
        let result = L.parse('\\xy.xy');
        let expected =
            l('x', l('y', ap('x', 'y')));
        expect(result).toMatchObject(expected);
    });

    it("makes application left-assoc and abstraction right-assoc", function() {
        expect(L.print(L.parse("\\x.xz\\y.xy"))).toBe("\\x.(xz)(\\y.xy)");
    })
});

describe('convertToIndices', function() {
    it("gives free variables indices according to alphabet", function() {
        expect(L.convertToIndices(L.parse('abc')))
            .toMatchObject(new L.Application(new L.Application(0, 1), 2));
    })

    it("adds the number of bindings to the index of free variables", function() {
        expect(L.convertToIndices(L.parse('\\x.a')))
            .toMatchObject(new L.Lambda('x', 1));
    })

    it("converts `(\\x.ax)b` to `(\\10)1`", function() {
        expect(L.convertToIndices(L.parse('(\\x.ax)b')))
            .toMatchObject(ap(new L.Lambda('x', new L.Application(1, 0)), 1))
    })

    it("converts `(\\xy.zx(\\u.ux))(\\x.wx)` to `(\\ \\ 27 1 (\\ 0 2)) (\\ 23 0)`",
       function() {
           let result = ap(l('x', l('y', ap(ap(27, 1), l('u', ap(0, 2))))), l('x', ap(23, 0)))
           expect(L.convertToIndices(L.parse("(\\x. \\y. z x (\\u. u x)) (\\x. w x)")))
               .toMatchObject(result);
       })
})

describe('convertToNames', function() {
    let input1 = ap(l('x', l('y', ap(ap('x', 'y'), 'z'))), 'a')
    it("forms identity when composed with convertToIndices", function() {
        expect(L.convertToNames(L.convertToIndices(input1))).toMatchObject(input1)
    })
})
