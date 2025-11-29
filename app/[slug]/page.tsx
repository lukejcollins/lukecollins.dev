import {notFound} from 'next/navigation'
import {PortableText} from '@portabletext/react'
import type {PortableTextBlock} from 'sanity'
import Link from 'next/link'
import {sanityClient} from '@/lib/sanity.client'
import {allPostsQuery, postBySlugQuery} from '@/lib/sanity.queries'

type Post = {
  _id: string
  title: string
  slug: string
  publishedAt: string
  excerpt?: string
  content: PortableTextBlock[]
}

async function getPost(slug: string): Promise<Post | null> {
  return sanityClient.fetch(postBySlugQuery, {slug})
}

type Params = Promise<{slug: string}>

export async function generateStaticParams() {
  const posts: {slug: string}[] = await sanityClient.fetch(allPostsQuery)
  return posts.map((post) => ({slug: post.slug}))
}

export async function generateMetadata(
  {params}: {params: Params},
) {
  const {slug} = await params
  const post = await getPost(slug)

  if (!post) {
    return {title: 'Not found'}
  }

  return {
    title: post.title,
    description: post.excerpt,
  }
}

export default async function BlogPostPage(
  {params}: {params: Params},
) {
  const {slug} = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      {/* Back link */}
      <Link
        href="/"
        className="text-sm text-gray-400 hover:text-gray-200 underline mb-6 inline-block"
      >
        ← Back
      </Link>

      <article>
        <h1 className="text-3xl font-bold mb-2">{post.title}</h1>

        {post.publishedAt && (
          <div className="text-sm text-gray-500 mb-6">
            {new Date(post.publishedAt).toLocaleDateString()}
          </div>
        )}

        <div className="prose">
          <PortableText value={post.content} />
        </div>
      </article>
    </main>
  )
}