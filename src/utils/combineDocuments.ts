import { Document } from 'langchain/document';

export const combineDocuments = (docs: Document[]) => {
  return docs.map((doc) => doc.pageContent).join('\n\n');
};
