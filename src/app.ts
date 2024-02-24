import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { prisma } from './data/prisma';
import { Document, Prisma, Project } from '@prisma/client';
import { ChatOpenAI, OpenAIChat, OpenAIEmbeddings } from '@langchain/openai';
import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PromptTemplate } from '@langchain/core/prompts';
// import { StringOutputParser } from 'langchain/schema/output_parser';
import { StringOutputParser } from '@langchain/core/output_parsers';

(async () => {
  await document();
  // await main();
})();

async function document() {
  try {
    //* Read File and Split
    // const filePath = path.resolve(__dirname, 'scrimba.txt');
    // const text = await fs.readFile(filePath, 'utf-8');

    // const splitter = new RecursiveCharacterTextSplitter({
    //   chunkSize: 500,
    //   chunkOverlap: 50,
    // });

    // const output = await splitter.createDocuments([text]);

    // console.log({ output });

    //* Store output in a prisma vector store
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

    //* Convert an user question in a standalone question
    //* Model
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.5,
      maxTokens: 500,
    });

    //* Embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    //* Vector store for user question embeddings
    const vectorStore = new PrismaVectorStore(embeddings, {
      db: prisma,
      prisma: Prisma,
      tableName: 'Document',
      vectorColumnName: 'vector',
      columns: {
        id: PrismaVectorStore.IdColumn,
        content: PrismaVectorStore.ContentColumn,
      },
    });

    //* Retriever
    const retriever = vectorStore.asRetriever();
    const template =
      'Given a question, convert it to a standalone question. question: {question} standalone question:';

    //* Prompt for template
    const prompt = PromptTemplate.fromTemplate(template);

    //* Output Parser
    const stringParser = new StringOutputParser();

    //* Chain llm model to string to retriever (user question)
    const chain = prompt.pipe(llm).pipe(stringParser).pipe(retriever);

    //* Invoke chain
    const response = await chain.invoke({
      question:
        'What are the technical requirements for running Scrimba? I only have a very old laptop which is not that powerful',
    });

    console.log({ response });

    // // //* As Documentation (Simpliest but without pipe chain)
    // // //* Generate standalone question from user question
    // const userQuestionTemplate =
    //   'Generate an standalone question from this {userQuestion}';
    // const userQuestionPrompt = PromptTemplate.fromTemplate(template);
    // const userQuestionChain = prompt.pipe(llm);
    // const response = await userQuestionChain.invoke({
    //   userQuestion:
    //     'What are the technical requirements for running Scrimba? I only have a very old laptop which is not that powerful',
    // });

    // //* Search for similarities in vectorStore
    // const result = await vectorStore.similaritySearch(
    //   response.content.toString()
    // );

    // console.log({ result });
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
