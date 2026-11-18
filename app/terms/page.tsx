import type { Metadata } from "next";
import Link from "next/link";
import { canonical, socialMeta } from "@/lib/seo";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms of Use -  MicroDegree",
  description: "The terms and conditions governing your use of the MicroDegree website and services.",
  alternates: { canonical: canonical("/terms") },
  ...socialMeta({ title: "Terms of Use -  MicroDegree", description: "The terms and conditions governing your use of the MicroDegree website and services.", path: "/terms" }),
};

export default function TermsPage() {
  return (
    <main className={styles.wrap}>
      <Link href="/" className={styles.home}>
        &larr; Back to home
      </Link>

      <h1 className={styles.title}>Terms of Use</h1>

      <p>
        <b>
          PLEASE READ THIS TERMS OF SERVICE AGREEMENT CAREFULLY. BY USING THIS WEBSITE OR APPLYING FOR COURSES FROM THIS
          WEBSITE, YOU AGREE TO BE BOUND BY ALL OF THE TERMS AND CONDITIONS OF THIS AGREEMENT.
        </b>
      </p>

      <p>
        This Terms of Service Agreement (the &ldquo;Agreement&rdquo;) governs your use of this website, microdegree.in
        (the &ldquo;Website&rdquo;), MicroDegree (&ldquo;Business Name&rdquo;). This Agreement includes, and incorporates
        by this reference, the policies and guidelines referenced below. MicroDegree reserves the right to change or
        revise the terms and conditions of this Agreement at any time by posting any changes or a revised Agreement on
        this Website. MicroDegree will alert you that changes or revisions have been made by indicating on the top of this
        Agreement the date it was last revised. The changed or revised Agreement will be effective immediately after it is
        posted on this Website. Your use of the Website following the update will constitute your acceptance of any such
        changes or revisions. MicroDegree encourages you to review this Agreement whenever you visit the Website to make
        sure that you understand the terms and conditions governing the use of the Website. This Agreement does not alter
        in any way the terms or conditions of any other written agreement you may have with MicroDegree for other products
        or services. By accessing this web site, you are agreeing to be bound by these web site Terms and Conditions of
        Use, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable
        local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The
        materials contained in this web site are protected by applicable copyright and trade mark law.
      </p>

      <h2>I. WEBSITE</h2>

      <p>
        <strong>Content, Intellectual Property, Third Party Links: </strong>In addition to making information available,
        this Website also offers information, both directly and through indirect links to third-party websites, about
        different content, job roles or companies. MicroDegree may not always create the information offered on this
        Website; instead the information is often gathered from other sources. To the extent that MicroDegree does create
        the content on this Website, such content is protected by intellectual property laws of India, foreign nations,
        and international bodies. Unauthorized use of the material may violate copyright, trademark, and/or other laws.
        You acknowledge that your use of the content on this Website is for personal, noncommercial use. The materials on
        the MicroDegree web site are provided &ldquo;as is&rdquo;. MicroDegree makes no warranties, expressed or implied,
        and hereby disclaims and negates all other warranties, including without limitation, implied warranties or
        conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or
        other violation of rights. Further, MicroDegree does not warrant or make any representations concerning the
        accuracy, likely results, or reliability of the use of the materials on its Internet web site or otherwise
        relating to such materials or on any sites linked to this site. We do not claim to represent either of the
        parties (company or candidate). We are just a mediator here trying to connect both the parties to each other. Any
        links to third-party websites are provided solely as a convenience to you. MicroDegree does not endorse the
        content on any such third-party websites. MicroDegree is not responsible for the content of or any damage that
        may result from your access to or reliance on these third-party websites. If you link to third-party websites,
        you do so at your own risk.
      </p>

      <p>
        <strong>Use of Website: </strong>MicroDegree is not responsible for any damages resulting from the use of this
        website by anyone. You will not use the Website for illegal purposes. You will (1) abide by all applicable local,
        state, national, and international laws and regulations in your use of the Website (including laws regarding
        intellectual property), (2) not interfere with or disrupt the use of the Website by other users, (3) not resell
        material on the Website, (4) not engage, directly or indirectly, in transmission of &ldquo;spam&rdquo;, chain
        letters, junk mail or any other type of unsolicited communication, and (5) not defame, harass, abuse, or disrupt
        other users of the Website
      </p>

      <p>
        <strong>License: </strong>By using this Website, you are granted a limited, non-exclusive, non-transferable right
        to use the content and materials on the Website in connection with your normal, noncommercial, use of the
        Website. You may not copy, reproduce, transmit, distribute, or create derivative works of such content or
        information without express written authorization from MicroDegree or the applicable third party (if third party
        content is at issue).
      </p>

      <p>
        <strong>Posting: </strong>By posting, storing, or transmitting any content on the Website, you hereby grant
        MicroDegree a perpetual, worldwide, non-exclusive, royalty-free, assignable, right and license to use, copy,
        display, perform, create derivative works from, distribute, have distributed, transmit and assign such content in
        any form, in all media now known or hereinafter created, anywhere in the world. MicroDegree does not have the
        ability to control the nature of the user-generated content offered through the Website. You are solely
        responsible for your interactions with other users of the Website and any content you post. MicroDegree is not
        liable for any damage or harm resulting from any posts by or interactions between users. MicroDegree reserves the
        right, but has no obligation, to monitor interactions between and among users of the Website and to remove any
        content MicroDegree deems objectionable.
      </p>

      <h2>II. LIMITATION OF LIABILITY</h2>

      <p>
        MicroDegree will not be liable for any direct, indirect, incidental, special or consequential damages in
        connection with this agreement or the products in any manner, including liabilities resulting from (1) the use or
        the inability to use the website content or products; (2) any services availed through the website; or (3) any
        lost profits you allege. Some jurisdictions do not allow the limitation or exclusion of liability for incidental
        or consequential damages so some of the above limitations may not apply to you.
      </p>

      <h2>III. INDEMNIFICATION</h2>

      <p>
        You will release, indemnify, defend and hold harmless MicroDegree, and any of its contractors, agents, employees,
        officers, directors, shareholders, affiliates and assigns from all liabilities, claims, damages, costs and
        expenses, including reasonable attorneys&apos; fees and expenses, of third parties relating to or arising out of
        (1) this Agreement or the breach of your warranties, representations and obligations under this Agreement; (2) the
        Website content or your use of the Website content; (3) the Products or your use of the Products (including Trial
        Products); (4) any intellectual property or other proprietary right of any person or entity; (5) your violation
        of any provision of this Agreement; or (6) any information or data you supplied to MicroDegree. When MicroDegree
        is threatened with suit or sued by a third party, MicroDegree may seek written assurances from you concerning
        your promise to indemnify MicroDegree; your failure to provide such assurances may be considered by MicroDegree
        to be a material breach of this Agreement. MicroDegree will have the right to participate in any defense by you
        of a third-party claim related to your use of any of the Website content or Products, with counsel of
        MicroDegree&apos;s choice at its expense. MicroDegree will reasonably cooperate in any defense by you of a
        third-party claim at your request and expense. You will have sole responsibility to defend MicroDegree against
        any claim, but you must receive MicroDegree&apos;s prior written consent regarding any related settlement. The
        terms of this provision will survive any termination or cancellation of this Agreement or your use of the Website
        or Products.
      </p>

      <h2>IV. PRIVACY</h2>

      <p>
        MicroDegree believes strongly in protecting user privacy and providing you with notice of our use of data. Please
        refer to our <Link href="/privacy">privacy policy</Link>, incorporated by reference herein, that is posted on the
        Website.
      </p>

      <h2>V. AGREEMENT TO BE BOUND</h2>

      <p>
        By using this Website or ordering Products, you acknowledge that you have read and agree to be bound by this
        Agreement and all terms and conditions on this Website.
      </p>

      <h2>VI. GENERAL</h2>

      <p>
        <strong>Force Majeure: </strong>MicroDegree will not be deemed in default hereunder or held responsible for any
        cessation, interruption or delay in the performance of its obligations hereunder due to earthquake, flood, fire,
        storm, natural disaster, act of God, war, terrorism, armed conflict, labor strike, lockout, or boycott.
      </p>

      <p>
        <strong>Cessation of Operation: </strong>MicroDegree may at any time, in its sole discretion and without advance
        notice to you, cease operation of the Website and distribution of the services.
      </p>

      <p>
        <strong>Entire Agreement: </strong>This Agreement comprises the entire agreement between you and MicroDegree and
        supersedes any prior agreements pertaining to the subject matter contained herein.
      </p>

      <p>
        <strong>Effect of Waiver: </strong>The failure of MicroDegree to exercise or enforce any right or provision of
        this Agreement will not constitute a waiver of such right or provision. If any provision of this Agreement is
        found by a court of competent jurisdiction to be invalid, the parties nevertheless agree that the court should
        endeavor to give effect to the parties&apos; intentions as reflected in the provision, and the other provisions
        of this Agreement remain in full force and effect.
      </p>

      <p>
        <strong>Governing Law; Jurisdiction: </strong>This Website originates from Bengaluru, Karnataka. This Agreement
        will be governed by the laws of the State of Karnataka without regard to its conflict of law principles to the
        contrary. Neither you nor MicroDegree will commence or prosecute any suit, proceeding or claim to enforce the
        provisions of this Agreement, to recover damages for breach of or default of this Agreement, or otherwise arising
        under or by reason of this Agreement, other than in courts located in the State of Karnataka. By using this
        Website or availing services, you consent to the jurisdiction and venue of such courts in connection with any
        action, suit, proceeding or claim arising under or by reason of this Agreement. You hereby waive any right to
        trial by jury arising out of this Agreement and any related documents.
      </p>

      <p>
        <strong>Statute of Limitation: </strong>You agree that regardless of any statute or law to the contrary, any
        claim or cause of action arising out of or related to use of the Website or Products or this Agreement must be
        filed within one (1) year after such claim or cause of action arose or be forever barred.
      </p>

      <p>
        <strong>Waiver of Class Action Right: </strong>By entering into this agreement, you hereby irrevocably waive any
        right you may have to join claims with those of others in the form of a class action or similar procedural
        device. Any claims arising out of, relating to, or connection with this agreement must be asserted individually.
        MicroDegree reserves the right to terminate your access to the Website if it reasonably believes, in its sole
        discretion, that you have breached any of the terms and conditions of this Agreement. Following termination, you
        will not be permitted to use the Website. If your access to the Website is terminated, MicroDegree reserves the
        right to exercise whatever means it deems necessary to prevent unauthorized access of the Website. This Agreement
        will survive indefinitely unless and until MicroDegree chooses, in its sole discretion and without advance notice
        to you, to terminate it.
      </p>

      <p>
        <b>
          BY USING THIS WEBSITE OR AVAILING SERVICES FROM THIS WEBSITE YOU AGREE TO BE BOUND BY ALL OF THE TERMS AND
          CONDITIONS OF THIS AGREEMENT.
        </b>
      </p>
    </main>
  );
}
