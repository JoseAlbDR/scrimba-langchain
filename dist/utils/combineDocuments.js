"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combineDocuments = void 0;
const combineDocuments = (docs) => {
    return docs.map((doc) => doc.pageContent).join('\n\n');
};
exports.combineDocuments = combineDocuments;
