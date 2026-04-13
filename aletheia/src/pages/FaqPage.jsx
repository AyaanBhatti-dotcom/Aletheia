import { useState } from 'react'

const faqItems = [
  {
    question: 'How long have you had these symptoms and how have they changed over time?',
    answer:
      'Track when your symptoms first started, how often they happen, and whether they have become more frequent, more intense, or started affecting new parts of your life over time.',
  },
  {
    question: 'Where exactly is your pain and does it move?',
    answer:
      'Note the exact areas where you feel pain, whether it stays in one place or radiates, and if it spreads to your back, hips, legs, shoulders, or abdomen.',
  },
  {
    question: 'Does your pain correlate with your menstrual cycle?',
    answer:
      'Pay attention to whether pain begins before your period, during bleeding, around ovulation, or continues throughout the month without a clear cycle pattern.',
  },
  {
    question: 'Have you noticed any digestive or bladder symptoms around your period?',
    answer:
      'Watch for symptoms such as bloating, nausea, constipation, diarrhea, bladder urgency, or painful urination that seem to increase around your cycle.',
  },
  {
    question: 'Has anything helped or worsened your symptoms?',
    answer:
      'Consider whether rest, heat, medication, movement, meals, stress, sex, exercise, or your cycle timing make symptoms feel better or worse.',
  },
  {
    question: 'Have any family members been diagnosed with endometriosis?',
    answer:
      'Family history can be relevant, so it helps to know whether a parent, sibling, or close relative has had endometriosis or similar chronic pelvic pain symptoms.',
  },
  {
    question: 'What imaging or tests have you had so far?',
    answer:
      'Keep a list of prior ultrasounds, MRIs, lab work, pelvic exams, or other testing, along with anything you were told about the results.',
  },
  {
    question: 'Have you tried hormonal treatments and what was the effect?',
    answer:
      'Think about any birth control, hormone therapy, or cycle-suppressing treatment you have tried and whether it improved symptoms, caused side effects, or had no effect.',
  },
  {
    question: 'How are your symptoms affecting your daily life and work?',
    answer:
      'Be ready to describe how symptoms affect sleep, exercise, concentration, work, school, caregiving, relationships, or other routine daily activities.',
  },
  {
    question: 'What are my surgical and non-surgical treatment options?',
    answer:
      'This question can help guide a discussion about pain management, pelvic floor therapy, hormonal treatment, imaging follow-up, specialist referral, and possible surgical options.',
  },
  {
    question: 'Is endometriosis just having a really bad period?',
    answer:
      'No. Endometriosis is a chronic, whole-body inflammatory disease where tissue similar to the uterine lining grows outside the uterus. While severe period pain is a common symptom, it is not just "normal" cramping.',
  },
  {
    question: 'Will a regular ultrasound show if I have endometriosis?',
    answer:
      'Not always. While ultrasounds and MRIs can show deep nodules or cysts on the ovaries (endometriomas), they frequently cannot see superficial endometriosis. A "clear" scan does not mean you do not have the disease.',
  },
  {
    question: 'Does a hysterectomy or getting pregnant cure endometriosis?',
    answer:
      'No, there is currently no cure for endometriosis. Because the disease exists outside the uterus, removing the reproductive organs does not guarantee the disease is gone. Similarly, pregnancy may temporarily suppress symptoms for some, but it is not a cure.',
  },
  {
    question: 'Does the severity of my pain mean my endometriosis is advanced?',
    answer:
      'No. The stage of endometriosis (I through IV) describes how far the tissue has spread and how deep it is, but it does not correlate to pain levels. You can have Stage I endometriosis and experience debilitating pain, or Stage IV and have very few symptoms.',
  },
  {
    question: 'Do you primarily use excision or ablation surgery to treat endometriosis?',
    answer:
      'This is crucial to ask, as excision (cutting the disease out at the root) is widely considered the gold standard over ablation (burning the surface), which has a higher recurrence rate.',
  },
  {
    question: 'If you suspect endometriosis on my bowel or bladder, will a specialist be present during surgery?',
    answer:
      'Endometriosis can cover multiple organs. Asking this ensures your surgeon works with a multidisciplinary team (like a urologist or colorectal surgeon) so all the disease can be removed safely in one surgery.',
  },
  {
    question: 'Do you require patients to try hormonal treatments before agreeing to surgery?',
    answer:
      'This helps you understand the doctor\'s treatment philosophy. Some doctors mandate trying birth control or medications like Orilissa first, while others are willing to proceed straight to diagnostic surgery based on your symptoms.',
  },
  {
    question: 'Will you be taking pathology samples during my surgery to confirm the diagnosis?',
    answer:
      'Endometriosis can only be 100% definitively diagnosed through a biopsy evaluated by pathology. It is important to confirm that the surgeon will send tissue samples to the lab rather than just diagnosing by sight.',
  },
  {
    question: 'What is your long-term management plan for me after surgery?',
    answer:
      'Surgery is only one part of endometriosis care. This question helps establish a plan for pelvic floor physical therapy, pain management, and hormonal suppression to maintain your quality of life after you heal.',
  },
]

function FaqItem({ answer, index, isOpen, onToggle, question }) {
  return (
    <div
      className="card"
      style={{ padding: 0, overflow: 'hidden' }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${index}`}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          color: 'var(--color-text)',
          padding: '18px 20px',
          borderRadius: isOpen ? 'var(--radius-xl) var(--radius-xl) 0 0' : 'var(--radius-xl)',
          font: '500 15px var(--font-body)',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          cursor: 'pointer',
          transition: 'background 180ms ease',
          border: 'none',
        }}
        onMouseOver={(e) => { if (!isOpen) e.currentTarget.style.background = 'var(--color-accent)' }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
        onFocus={(e) => { e.currentTarget.style.background = 'var(--color-accent)' }}
        onBlur={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <span
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: isOpen ? 'var(--color-primary)' : 'var(--color-accent)',
            border: `1.5px solid ${isOpen ? 'var(--color-primary)' : 'var(--color-border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '1px',
            transition: 'all 180ms ease',
            color: isOpen ? '#fff' : 'var(--color-text-muted)',
            fontSize: '12px',
            fontWeight: 700,
          }}
          aria-hidden="true"
        >
          {isOpen ? '−' : '+'}
        </span>
        <span style={{ fontWeight: isOpen ? 600 : 500 }}>{question}</span>
      </button>

      {isOpen && (
        <div
          id={`faq-answer-${index}`}
          style={{
            padding: '0 20px 20px 56px',
            fontSize: '14px',
            lineHeight: 1.65,
            color: 'var(--color-text-muted)',
            fontWeight: 500,
            animation: 'fade-up 180ms ease both',
          }}
        >
          {answer}
        </div>
      )}
    </div>
  )
}

function FaqPage() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <div style={{ width: '100%', maxWidth: '680px', display: 'grid', gap: '14px' }}>

      <div style={{ paddingBottom: '4px' }}>
        <h1 style={{ marginBottom: '6px' }}>Doctor guide</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          Questions to help you prepare for appointments.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {faqItems.map((item, index) => (
          <FaqItem
            key={item.question}
            index={index}
            question={item.question}
            answer={item.answer}
            isOpen={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
          />
        ))}
      </div>
    </div>
  )
}

export default FaqPage
