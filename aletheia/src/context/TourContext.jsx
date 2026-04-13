/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'

const TourContext = createContext({
  activeTourTarget: null,
  isTourOpen: false,
})

export function TourProvider({ children, value }) {
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export function useTour() {
  return useContext(TourContext)
}
