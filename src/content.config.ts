import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const sites = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/sites',
  }),
  schema: z.object({
    title: z.string().min(1).max(60, 'title は SEO のため 60 字以内推奨'),
    description: z
      .string()
      .min(1)
      .max(120, 'description は SEO のため 120 字以内推奨'),
    city: z.string().min(1),
    niche: z.string().min(1),
    area: z.string().optional(),
    symptom: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().min(1),
    faqs: z.array(faqSchema).optional(),
    /** 特定ページの構造化データ種別を上書きしたい場合 */
    pageType: z.enum(['top', 'article', 'service', 'area', 'symptom']).optional(),
    /** 一覧やパンくずでの並び順 */
    order: z.number().optional(),
    /** 下書き */
    draft: z.boolean().optional(),
  }),
});

export const collections = { sites };
