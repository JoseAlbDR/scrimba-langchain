import { OpenAIEmbeddings } from '@langchain/openai';
import * as dotenv from 'dotenv';
import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { prisma } from '../data/prisma';
import { Documents, Prisma } from '@prisma/client';
dotenv.config();

const embeddings = new OpenAIEmbeddings();
const vectorStore = new PrismaVectorStore(embeddings, {
  db: prisma,
  prisma: Prisma,
  tableName: 'Documents',
  vectorColumnName: 'vector',
  columns: {
    id: PrismaVectorStore.IdColumn,
    content: PrismaVectorStore.ContentColumn,
  },
});

export const retriever = vectorStore.asRetriever();
