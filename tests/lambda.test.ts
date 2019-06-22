import * as L from '../src/lambda';

const interpret = (s: string) => L.print(L.evaluate(L.parse(s)));

describe('evaluate', function() {
    it("beta reduces `(\\x.x)y` to `y`", function() {
        let result = L.evaluate({kind: 'ap', a: {kind: 'l', head: 'x', body: 'x'}, b: 'y'});
        expect(result).toBe('y');
    });

    it("applies succ to zero to get one", function() {
        expect(interpret(L.succ + L.zero))
            .toBe("\\y.\\x.yx");
    })

    it("maintains alpha-equivalence", function() {
        expect(interpret("(\\x.\\y.x)y")).not.toBe("\\y.y");
    })
})

describe('DepthFirst', function() {
    let t

    it("acts as identity when forward is iterated until it returns false", function() {
        let input1 = L.succ + L.zero;
        let parsed = L.parse(input1) as L.application;
        t = new L.DepthFirst(parsed);
        let notDone = true;
        while (notDone) {
            notDone = t.forward();
        }

        expect(t.current).toMatchObject(parsed);
    })

    it("visits everything not contained within further lambdas",
       function() {
           let input2 = "(\\a.a\\z.z)b(\\c.cy)de"
           let parsed = L.parse(input2);
           t = new L.DepthFirst(parsed);
           let visited: string[] = [];
           let notDone = true;

           while (notDone) {
               if (L.isLambda(t.current)) {
                   visited.push(t.current.head);
               } else if (typeof t.current == "string") {
                   visited.push(t.current);
               }
               notDone = t.forward();
           }

           visited.sort()
           expect(visited).toMatchObject(['a','b','c','d','e']);
       })
})

describe('bind', function() {
    it("uses lexical scoping", function() {
        // this is equivalent to `\x.x(\x.x)x`
        let input = {kind: 'l' as 'l',
                     head: 'x',
                     body: {kind: 'ap',
                            a: {kind: 'ap',
                                a: 'x',
                                b: {kind: 'l',
                                    head: 'x',
                                    body: 'x'}},
                            b: 'x'}};

        let result = L.bind(input as L.lambda, 'y');
        let expected = {kind: 'ap',
                        a: {kind: 'ap',
                            a: 'y',
                            b: {kind: 'l',
                                head: 'x',
                                body: 'x'}},
                        b: 'y'};
        expect(result).toMatchObject(expected);
    });
});

describe('parse', function() {
    it("uncurries `\\xy.xy` to `\\x.(\\y.xy)`", function() {
        let result = L.parse('\\xy.xy');
        let expected = {kind: 'l',
                        head: 'x',
                        body: {kind: 'l',
                               head: 'y',
                               body: {kind: 'ap',
                                      a: 'x',
                                      b: 'y'}}};
        expect(result).toMatchObject(expected);
    });

    it("makes application left-assoc and abstraction right-assoc", function() {
        expect(L.print(L.parse("\\x.xz\\y.xy"))).toBe("\\x.(xz)(\\y.xy)");
    })
});
