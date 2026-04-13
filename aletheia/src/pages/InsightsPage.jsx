import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useDemo } from '../context/DemoContext.jsx'
import { getCycleEntries, getSymptomEntries } from '../db/db.js'
import { cycleEntries as demoCycleEntries, symptomEntries as demoSymptomEntries } from '../demo/demoData.js'
import {
  averagePainLast30Days,
  cyclePhaseSummary,
  detectFlare,
  highFrequencySymptoms,
  topSymptoms,
} from '../patterns/engine.js'

function formatDate(value) {
  return new Date(value).toLocaleDateString()
}

function InsightsPage() {
  const { isDemoMode } = useDemo()
  const [symptomEntries, setSymptomEntries] = useState([])
  const [cycleEntries, setCycleEntries] = useState([])
  const [loadedSource, setLoadedSource] = useState('')
  const sourceKey = isDemoMode ? 'demo' : 'db'

  useEffect(() => {
    let isMounted = true

    const entriesPromise = isDemoMode
      ? Promise.resolve([demoSymptomEntries, demoCycleEntries])
      : Promise.all([getSymptomEntries(), getCycleEntries()])

    entriesPromise.then(([nextSymptomEntries, nextCycleEntries]) => {
      if (!isMounted) {
        return
      }

      setSymptomEntries(nextSymptomEntries)
      setCycleEntries(nextCycleEntries)
      setLoadedSource(sourceKey)
    })

    return () => {
      isMounted = false
    }
  }, [isDemoMode, sourceKey])

  if (loadedSource !== sourceKey) {
    return <LoadingSpinner />
  }

  const totalEntries = symptomEntries.length + cycleEntries.length

  if (totalEntries < 7) {
    return (
      <div style={{ width: '100%', maxWidth: '720px' }}>
        <div className="card">
          <h1>Insights</h1>
          <EmptyState
            title="No patterns yet"
            description="Add at least 7 entries to start seeing patterns and summaries here."
          />
        </div>
      </div>
    )
  }

  const flares = detectFlare(symptomEntries)
  const averagePain = averagePainLast30Days(symptomEntries)
  const topFiveSymptoms = topSymptoms(symptomEntries, 5)
  const frequentSymptoms = highFrequencySymptoms(symptomEntries)
  const phasePain = cyclePhaseSummary(symptomEntries, cycleEntries)

  return (
    <div style={{ width: '100%', maxWidth: '900px', display: 'grid', gap: '20px' }}>
      <h1 style={{ margin: 0 }}>Insights</h1>

      <section className="card">
        <h2>Flare history</h2>
        {flares.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {flares.map((flare) => (
              <div key={`${flare.startDate}-${flare.endDate}`}>
                <p>
                  {formatDate(flare.startDate)} to {formatDate(flare.endDate)}
                </p>
                <p>{flare.duration} days</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No flare patterns detected.</p>
        )}
      </section>

      <section className="card">
        <h2>Average pain</h2>
        <p>{averagePain}</p>
      </section>

      <section className="card">
        <h2>Top 5 symptoms</h2>
        {topFiveSymptoms.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {topFiveSymptoms.map((item) => (
              <div key={item.symptom}>
                <p>{item.symptom}</p>
                <p>
                  {item.count} entries ({Math.round(item.percentage * 100)}%)
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p>No symptom data available.</p>
        )}
      </section>

      <section className="card">
        <h2>High frequency symptoms</h2>
        {frequentSymptoms.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {frequentSymptoms.map((item) => (
              <div key={item.symptom}>
                <p>{item.symptom}</p>
                <p>
                  {item.count} entries ({Math.round(item.percentage * 100)}%)
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p>No symptoms exceeded the frequency threshold.</p>
        )}
      </section>

      <section className="card">
        <h2>Cycle phase pain</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <p>Menstrual</p>
            <p>{phasePain.menstrual}</p>
          </div>
          <div>
            <p>Follicular</p>
            <p>{phasePain.follicular}</p>
          </div>
          <div>
            <p>Ovulatory</p>
            <p>{phasePain.ovulatory}</p>
          </div>
          <div>
            <p>Luteal</p>
            <p>{phasePain.luteal}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default InsightsPage
