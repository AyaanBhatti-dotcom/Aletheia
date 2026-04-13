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
