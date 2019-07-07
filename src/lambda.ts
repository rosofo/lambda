import * as P from 'parsimmon';

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export const identity = "(\\x.x)"
export const succ = "(\\wyx.y(wyx))";
export const zero = "(\\sz.z)";
export const add = (a: string, b: string) => a + "(\\mnfx.mf(nfx))" + b;

export function numberExpression(n: number): expression {
    let expr: expression = 'z'
    for (let i = 0; i < n; i++) {
        expr = new Application('s', expr);
    }
    return new Lambda('s', new Lambda('z', expr));
}

// types

export class Lambda<T = name> {
    head: name;
    body: expression<T>;
    constructor(head: name, body: expression<T>) {
        this.head = head;
        this.body = body;
    }
};

export type name = string;
export type index = number;

export class Application<T = name> {
    a: expression<T>;
    b: expression<T>;
    constructor(a: expression<T>, b: expression<T>) {
        this.a = a;
        this.b = b;
    }
};

export type expression<T = name> = Lambda<T> | T | Application<T>;



export const interpret = (s: string) => evaluate(convertToIndices(parse(s)));

export function evaluate(expr: expression<index>): expression<index> {
    let gen = evaluateGen(expr);
    let result;
    let next = gen.next();
    while (!next.done) {
        result = next.value;
        next = gen.next();
    }
    return result as expression<index>;
}

export function* evaluateGen(expr: expression<index>): IterableIterator<expression<index>> {
    yield clone(expr);

    let t = new DepthFirst(expr);
    let done = false;

    while (!done) {
        if (t.current instanceof Lambda) {
            if (t.rightSibling != undefined) {
                let result = bind(t.current, t.rightSibling);
                t.up();
                t.current = result;
                if (t.current instanceof Lambda) t.current = renameHead(t.current);
                yield clone(t.expression);
            } else {
                t.enterScope();
            }
        } else {
            done = t.forward();
        }
    }
}


// traversal

type node<T> = {ap: Application<T>, branchToNext: "left" | "right"};

export class Traverser<T> {
    _current: expression<T>;
    stack: node<T>[];
    contexts: {current: Lambda<T>, stack: node<T>[]}[] = [];

    constructor(expr: expression<T>) {
        this._current = expr;
        this.stack = [];
        this.contexts = [];
    }

    set current(expr: expression<T>) {
        this._current = expr;

        if (this.stack[0]) {
            let above: node<T> = last(this.stack);
            if (above.branchToNext == "left") above.ap.a = expr;
            else above.ap.b = expr;
        } else if (this.contexts[0]) {
            last(this.contexts).current.body = expr;
        }
    }

    get current() {
        return this._current;
    }

    get rightSibling(): expression<T> | undefined {
        let parent = last(this.stack);
        if (parent && parent.branchToNext == "left") {
            return parent.ap.b;
        }
    }

    get expression(): expression<T> {
        let top;
        let topContext = this.contexts[0];
        if (topContext) {
            if (topContext.stack[0]) {
                top = topContext.stack[0].ap;
            } else {
                top = topContext.current;
            }
        } else if (this.stack[0]){
            top = this.stack[0].ap;
        } else {
            top = this.current;
        }
        return top;
    }


    left() {
        if (this.current instanceof Application) {
            this.stack.push({ap: this.current, branchToNext: "left"});
            this.current = this.current.a;
            return true;
        } else return false;
    }

    right() {
        if (this.current instanceof Application) {
            this.stack.push({ap: this.current, branchToNext: "right"});
            this.current = this.current.b;
            return true;
        } else return false;
    }

    up() {
        let above = this.stack.pop();
        if (above) {
            this.current = above.ap;
            return true;
        } else return false;
    }

    enterScope() {
        if (this.current instanceof Lambda) {
            this.contexts.push({current: this.current, stack: this.stack});
            this._current = this.current.body;
            this.stack = [];
        }
    }

    exitScope() {
        let outer = this.contexts.pop();
        if (outer && !this.stack.length) {
            this.current = outer.current;
            this.stack = outer.stack;
        }
    }
}

export class DepthFirst<T> extends Traverser<T> {
    forwardAfterScopesExit: boolean;
    afterScopeExit: undefined | (() => any);

    constructor(expr: expression<T>) {
        super(expr);
        this.forwardAfterScopesExit = true;
    }

    exitScopes(): boolean {
        while (!this.stack[0] && this.contexts[0]) {
            this.exitScope();
            if (this.afterScopeExit) this.afterScopeExit();
            if (this.forwardAfterScopesExit) this.forward();
        }

        return !this.stack[0] && !this.contexts[0];
    }

    forward(): boolean {
        if (this.current instanceof Application) {
            this.left();
            return false;
        } else return this.nextBranch();
    }

    nextBranch(): boolean {
        let above = last(this.stack);
        while (above && above.branchToNext == "right") {
            this.up();
            above = last(this.stack);
        }
        if (above) {
            this.up();
            this.right();
        } else {
            return this.exitScopes();
        }

        return false;
    }
}

export function bind(lambda: Lambda<index>, expr: expression<index>): expression<index> {
    const incrementFreeBy = (expr: expression<index>, n: number) => {
        return mapVariables(expr, (current, bindings) => {
            return current >= bindings.length ? current + n : current;
        })
    }

    return mapVariables(lambda.body, (current, bindings) => {
        if (current == bindings.length) {
            return incrementFreeBy(clone(expr), bindings.length);
        } else if (current > bindings.length){
            return current - 1; // decrement free variables
        } else {
            return current;
        }
    });
}

export function renameHead(lambda: Lambda<index>): Lambda<index> {
    for (let letter of ALPHABET) {
        if (!findBy(lambda.body, (current, bindings) => {
            let freeEquivalentofHead = ALPHABET.indexOf(lambda.head) + bindings.length + 1;
            return current === freeEquivalentofHead;
        })) break;
        else lambda.head = letter;
    }

    return lambda;
}

// indices

export function convertToIndices(expr: expression<name>): expression<index> {
    return mapVariables(expr, (current, bindings) => {
        let index = bindings.lastIndexOf(current);
        if (index >= 0) return bindings.length - 1 - index;
        else return ALPHABET.indexOf(current) + bindings.length;
    })
}


export function convertToNames(expr: expression<index>): expression<name> {
    return mapVariables(expr, (current, bindings) => {
        let index = bindings.length - 1 - current;
        if (bindings[index]) return bindings[index];
        else return ALPHABET[current - bindings.length];
    })
}

// printing

export function print<T>(expr: expression<T>): string {
    if (expr instanceof Lambda) return `\\${expr.head}.${print(expr.body)}`;
    else if (expr instanceof Application) {
        let a = print(expr.a), b = print(expr.b);
        if (typeof expr.a != "string" && typeof expr.a != "number") a = `(${a})`;
        if (typeof expr.b != "string" && typeof expr.b != "number") b = `(${b})`;
        return a + b;
    } else {
        return String(expr);
    }
}

// parsing

export function parse(string: string): expression {
    return Lang.Term.tryParse(string);
}

const Lang = P.createLanguage<{
    Term: expression,
    Lambda: Lambda,
    Application: expression,
    Name: name,
    Atom: expression,
    Constant: expression
}>({
    Term: r => r.Application.or(r.Lambda),
    Lambda: r => {
        return P.seq(P.oneOf('\\'), r.Name.trim(P.optWhitespace).atLeast(1), P.oneOf('.'), r.Term)
            .map(result => {
                let names = result[1]
                return names.reduceRight((acc, name) => {
                    return new Lambda(name, acc);
                }, result[3]) as Lambda;
            })
    },
    Application: r => {
        return r.Atom.atLeast(1)
            .map(atoms => {
                return atoms.reduce((acc, atom) => {
                    return new Application(acc, atom);
                });
            })
    },
    Name: () => P.regexp(/[a-z]/),
    Atom: r => P.alt(r.Term.wrap(P.string('('), P.string(')')), r.Name, r.Lambda, r.Constant)
        .trim(P.optWhitespace),
    Constant: _ => P.seq(P.regexp(/[A-Z]/i), P.letter.many())
        .map(result => {
            let c;
            if (result instanceof Array) {
                result[1].unshift(result[0]);
                c = constants.get(result[1].join(''));
            } else c = constants.get(result);
            if (c) return c;
            else throw new Error("Unknown constant");
        }).or(P.digit.atLeast(1)
              .map(result => {
                  return numberExpression(Number(result.join('')));
              }))
});

let constants: Map<string, expression> = new Map([
    ['Succ', parse(succ)],
    ['Add', parse("(\\ab.(a (\\wyx.y(wyx))) b)")]
]);

// helpers

function last(array: any[]): any {
    return array[array.length - 1];
}

function mapVariables<A, B>(expr: expression<A>, f: (c: A, bs: name[]) => expression<B>): expression<B> {
    let exprToModify: expression<A | B> = clone(expr);
    let t = new DepthFirst(exprToModify);
    let bindings: name[] = [];
    t.afterScopeExit = () => {
        bindings.pop();
    }

    let done = false;
    while (!done) {
        if (t.current instanceof Lambda) {
            bindings.push(t.current.head)
            t.enterScope();
        } else {
            if (t.current instanceof Application) {
                done = t.forward();
            } else {
                t.current = f(t.current as A, bindings);
                done = t.nextBranch();
            }
        }
    }

    return t.current as expression<B>;
}

function findBy<T>(expr: expression<T>, predicate: (current: T, bs: name[]) => boolean): T | null {
    let t = new DepthFirst(expr);
    let bindings: name[] = [];
    t.afterScopeExit = () => {
        bindings.pop();
    }

    let done = false;
    while (!done) {
        if (t.current instanceof Lambda) {
            bindings.push(t.current.head)
            t.enterScope();
        } else {
            if (t.current instanceof Application) {
                done = t.forward();
            } else {
                if (predicate(t.current, bindings)) return t.current;
                done = t.nextBranch();
            }
        }
    }

    return null;
}

export function clone<T>(expr: expression<T>): expression<T> {
    let t = new DepthFirst(expr);

    let done = false;
    while (!done) {
        if (t.current instanceof Lambda) {
            t.current = new Lambda(t.current.head, t.current.body);
            t.enterScope();
        } else {
            if (t.current instanceof Application) {
                t.current = new Application(t.current.a, t.current.b);
            }

            done = t.forward();
        }
    }

    return t.current;
}
