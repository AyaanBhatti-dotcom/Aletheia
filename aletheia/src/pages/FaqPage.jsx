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
    <div className="card" style={{ padding: 0 }}>
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
          padding: '20px',
          borderRadius: 'var(--radius)',
        }}
      >
        {question}
      </button>
      {isOpen && (
        <div id={`faq-answer-${index}`} style={{ padding: '0 20px 20px' }}>
          <p style={{ margin: 0 }}>{answer}</p>
        </div>
      )}
    </div>
  )
}

function FaqPage() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <div style={{ width: '100%', maxWidth: '840px', display: 'grid', gap: '20px' }}>
      <div className="card">
        <h1 style={{ margin: 0 }}>FAQ</h1>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
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
