import Link from 'next/link'
import {sanityClient} from '@/lib/sanity.client'
import {allPostsQuery} from '@/lib/sanity.queries'

type Post = {
  _id: string
  title: string
  slug: string
  publishedAt: string
  excerpt?: string
}

async function getPosts(): Promise<Post[]> {
  return sanityClient.fetch(allPostsQuery)
}

export const metadata = {
  title: 'lukecollins.dev',
}

export default async function BlogIndexPage() {
  const posts = await getPosts()

  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">lukecollins.dev</h1>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post._id}>
            <Link
              href={`/${post.slug}`}
              className="text-xl font-semibold underline"
            >
              {post.title}
            </Link>
            {post.publishedAt && (
              <div className="text-sm text-gray-500">
                {new Date(post.publishedAt).toLocaleDateString()}
              </div>
            )}
            {post.excerpt && (
              <p className="text-sm mt-1">{post.excerpt}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}
