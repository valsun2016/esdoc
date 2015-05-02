import assert from 'assert';
import CommentParser from '../Parser/CommentParser.js';
import TestDoc from '../Doc/TestDoc.js';
import TestFileDoc from '../Doc/TestFileDoc.js';

let already = Symbol('already');

export default class TestDocFactory {
  static _getUniqueId() {
    if (!this._sequence) this._sequence = 0;

    return this._sequence++;
  }

  get results() {
    return [...this._results];
  }

  constructor(type, ast, pathResolver) {
    type = type.toLowerCase();
    assert(type === 'mocha');

    this._type = type;
    this._ast = ast;
    this._pathResolver = pathResolver;
    this._results = [];

    // file doc
    let doc = new TestFileDoc(ast, ast, pathResolver, []);
    this._results.push(doc.value);
  }

  push(node, parentNode) {
    if (node[already]) return;

    node[already] = true;
    Object.defineProperty(node, 'parent', {value: parentNode});

    if (this._type === 'mocha') this._pushForMocha(node, parentNode);
  }

  _pushForMocha(node) {
    if (node.type !== 'ExpressionStatement') return;

    let expression = node.expression;
    if (expression.type !== 'CallExpression') return;

    if (!['describe', 'it', 'context', 'suite', 'test'].includes(expression.callee.name)) return;

    expression[already] = true;
    Object.defineProperty(expression, 'parent', {value: node});

    let tags = [];
    if (node.leadingComments && node.leadingComments.length) {
      let comment = node.leadingComments[node.leadingComments.length - 1];
      tags = CommentParser.parse(comment);
    }

    let uniqueId = this.constructor._getUniqueId();
    expression._esdocTestId = uniqueId;
    expression._esdocTestName = expression.callee.name + uniqueId;

    let testDoc = new TestDoc(this._ast, expression, this._pathResolver, tags);

    this._results.push(testDoc.value);
  }
}
