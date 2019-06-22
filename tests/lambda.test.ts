import * as L from '../src/lambda';

describe('evaluate', function() {
    it("beta reduces `(\\x.x)y` to `y`", function() {
        let result = L.evaluate({kind: 'ap', a: {kind: 'l', head: 'x', body: 'x'}, b: 'y'});
        expect(result).toBe('y');
    });

    it("applies succ to zero to get one", function() {
        expect(L.print(L.evaluate(L.parse("(\\wyx.y(wyx))\\sz.z"))))
            .toBe("\\y.\\x.yx");
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
});
