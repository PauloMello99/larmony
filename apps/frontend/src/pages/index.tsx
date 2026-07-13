import type { NextPage } from "next"
import { makeI18nProps } from "@/shared/lib/i18n"
import { LandingPage } from "@/features/landing"

const Home: NextPage = () => <LandingPage />

export default Home

export const getServerSideProps = makeI18nProps(["common", "landing"])
