import * as P from 'parsimmon';

export const identity = "(\\x.x)"
export const succ = "(\\wyx.y(wyx))";
export const zero = "(\\sz.z)";
export const add = (a: string, b: string) => a + "(\\mnfx.mf(nfx))" + b;

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

export const interpret = (s: string) => evaluate(parse(s));

export function evaluate(expr: expression): expression {
    let gen = evaluateGen(expr);
    let result;
    let next = gen.next();
    while (!next.done) {
        result = next.value;
        next = gen.next();
    }
    return result as expression;
}

export function* evaluateGen(expr: expression): IterableIterator<expression> {
    yield expr;

    let t = new DepthFirst(expr);
    let done = false;

    while (!done) {
        if (t.current instanceof Lambda) {
            if (t.rightSibling) {
                let result = bind(t.current, t.rightSibling);
                t.up();
                t.current = result;
                yield t.expression;
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
    contexts: {current: expression<T>, stack: node<T>[]}[] = [];

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
        if (outer && outer.current instanceof Lambda && !this.stack.length) {
            this.current = outer.current;
            this.stack = outer.stack;
        }
    }
}

export class DepthFirst<T> extends Traverser<T> {
    afterExitScope: (() => any) | undefined;

    exitScopes() {
        while (!this.stack[0] && this.contexts[0]) {
            this.exitScope();
            if (this.afterExitScope) this.afterExitScope();
        }

        return !this.stack[0] && !this.contexts[0];
    }

    forward() {
        if (this.current instanceof Application) this.left();
        else {
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
        }

        return false;
    }
}

export function bind(lambda: Lambda, expr: expression): expression {
    function replaceInExpression(current: expression): expression {
        if (current instanceof Lambda) {
            if (current.head == lambda.head) {
                return current;
            } else {
                return new Lambda(
                    current.head,
                    replaceInExpression(current.body)
                );
            }
        } else if (current instanceof Application) {
            return new Application(
                replaceInExpression(current.a),
                replaceInExpression(current.b)
            );
        } else {
            return current == lambda.head ? expr : current;
        }
    }
        return replaceInExpression(lambda.body);
}

// indices

export function convertToIndices(expr: expression<name>): expression<index> {
    return mapExpr(expr, (current, bindings) => {
        let index = bindings.indexOf(current);
        if (index >= 0) return bindings.length - 1 - index;
        else return ALPHABET.indexOf(current) + bindings.length;
    })
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export function convertToNames(expr: expression<index>): expression<name> {
    return mapExpr(expr, (current, bindings) => {
        let index = -(current + 1);
        if (bindings[index]) return bindings[index];
        else return ALPHABET[current - bindings.length];
    })
}

function mapExpr<A, B>(expr: expression<A>, f: (c: A, bs: name[]) => B): expression<B> {
    let exprToModify: expression<A | B> = expr;
    let t = new DepthFirst(exprToModify);
    let bindings: name[] = [];
    t.afterExitScope = () => {
        bindings.pop();
        if (t.stack[0]) done = t.forward();
    }

    let done = false;
    while (!done) {
        if (t.current instanceof Lambda) {
            bindings.push(t.current.head)
            t.enterScope();
        } else {
            if (t.current instanceof Application) {}
            else t.current = f(t.current as A, bindings);

            done = t.forward();
        }
    }

    return t.current as expression<B>;
}

// printing

export function print(expr: expression): string {
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
    return Lang.Term.tryParse(string.replace(/\s/g, ''));
}

const Lang = P.createLanguage<{
    Term: expression,
    Lambda: Lambda,
    Application: expression,
    Name: name,
    Atom: expression
}>({
    Term: r => r.Application.or(r.Lambda),
    Lambda: r => {
        return P.seq(P.oneOf('\\'), r.Name.atLeast(1), P.oneOf('.'), r.Term)
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
    Name: () => P.letter,
    Atom: r => P.alt(r.Term.wrap(P.string('('), P.string(')')), r.Name, r.Lambda)
});

// helpers

function last(array: any[]): any {
    return array[array.length - 1];
}
