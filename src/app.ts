import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { prisma } from './data/prisma';
import { Document, Prisma, Project } from '@prisma/client';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PromptTemplate } from '@langchain/core/prompts';

(async () => {
  await document();
  // await main();
})();

async function document() {
  try {
    // const filePath = path.resolve(__dirname, 'scrimba.txt');
    // const text = await fs.readFile(filePath, 'utf-8');

    // const splitter = new RecursiveCharacterTextSplitter({
    //   chunkSize: 500,
    //   chunkOverlap: 50,
    // });

    // const output = await splitter.createDocuments([text]);

    // console.log({ output });

    // const vectorStore = PrismaVectorStore.withModel<Document>(prisma).create(
    //   new OpenAIEmbeddings({
    //     openAIApiKey: process.env.OPENAI_API_KEY,
    //   }),
    //   {
    //     prisma: Prisma,
    //     tableName: 'Document',
    //     vectorColumnName: 'vector',
    //     columns: {
    //       id: PrismaVectorStore.IdColumn,
    //       content: PrismaVectorStore.ContentColumn,
    //     },
    //   }
    // );

    // await PrismaVectorStore.fromDocuments(
    //   output,
    //   new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY }),
    //   {
    //     db: prisma,
    //     prisma: Prisma,
    //     tableName: 'Document',
    //     vectorColumnName: 'vector',
    //     columns: {
    //       id: PrismaVectorStore.IdColumn,
    //       content: PrismaVectorStore.ContentColumn,
    //     },
    //   }
    // );

    // await vectorStore.addModels(
    //   await prisma.$transaction(
    //     output.map((chunk) =>
    //       prisma.document.create({
    //         data: {
    //           content: chunk.pageContent,
    //         },
    //       })
    //     )
    //   )
    // );

    // console.log({ vectorStore });¨

    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      // temperature: 0.5,
    });

    const tweetTemplate =
      'Generate a promotional tweet for a product, from this product description: {productDesc}';

    const tweetPrompt = PromptTemplate.fromTemplate(tweetTemplate);

    // console.log(tweetPrompt);

    const tweetChain = tweetPrompt.pipe(llm);

    // console.log(tweetChain);

    const response = await tweetChain.invoke({ productDesc: 'Electric shoes' });

    console.log(response.content);
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
      description: 'Personal Portfolio page done with MERN stack',
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

  const resultOne = await vectorStore.similaritySearch('Nodepop');

  console.log({ resultOne });
  console.log(resultOne[0].metadata);
}
