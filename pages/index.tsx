import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { Heading, Paragraph } from 'react-magma-dom'
import { Jumbotron } from 'common-experience-library'

const Home: NextPage = () => {
  const router = useRouter();
  const token = router.query.token;
  const eISBN = router.query.eISBN;
  const courseKey = router.query.courseKey;
  const guid = router.query.guid;

  return (
    <div>
      <Head>
        <title>Cengage Platform</title>
        <meta name="description" content="Cengage Platform by Cengage Group" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Heading level={1} css>
          Launch Page from Dev Login
        </Heading>

        <Jumbotron title='Session Data' description={''}>
          <Paragraph>Token: {token}</Paragraph>
          <Paragraph>eISBN: {eISBN}</Paragraph>
          <Paragraph>courseKey: {courseKey}</Paragraph>
          <Paragraph>User GUID: {guid}</Paragraph>
        </Jumbotron>
      </main>
    </div>
  )
}

export default Home;
