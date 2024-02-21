import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { prisma } from './data/prisma';
import { Document, Prisma, Project } from '@prisma/client';
import { OpenAIEmbeddings } from '@langchain/openai';
import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

(async () => {
  await document();
})();

async function document() {
  try {
    const filePath = path.resolve(__dirname, 'adoptaunpeludo.txt');
    const text = await fs.readFile(filePath, 'utf-8');

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    const output = await splitter.createDocuments([text]);

    const vectorStore = PrismaVectorStore.withModel<Document>(prisma).create(
      new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
      }),
      {
        prisma: Prisma,
        tableName: 'Document',
        vectorColumnName: 'vector',
        columns: {
          id: PrismaVectorStore.IdColumn,
          content: PrismaVectorStore.ContentColumn,
        },
      }
    );
  } catch (error) {
    console.log(error);
  }
}
async function main() {
  const vectorStore = PrismaVectorStore.withModel<Project>(prisma).create(
    new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    }),
    {
      prisma: Prisma,
      tableName: 'Project',
      vectorColumnName: 'vector',
      columns: {
        id: PrismaVectorStore.IdColumn,
        description: PrismaVectorStore.ContentColumn,
        title: PrismaVectorStore.ContentColumn,
      },
    }
  );

  const projects = [
    {
      title: 'Nodepop',
      description: 'FullStack Store done with a MERN stack',
    },
    {
      title: 'Portfolio',
      description: 'Persona Portfolio page done with MERN stack',
    },
  ];

  await vectorStore.addModels(
    await prisma.$transaction(
      projects.map((project) =>
        prisma.project.create({
          data: {
            title: project.title,
            description: project.description,
            image: 'default',
          },
        })
      )
    )
  );

  const resultOne = await vectorStore.similaritySearch('MERN', 1);

  console.log({ resultOne });
  console.log(resultOne[0].metadata);
}
