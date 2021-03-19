import {atom, useRecoilState} from "recoil"
import useSWR from "swr"
import {IDLE, LOADING} from "../global/constants"
import fetcher from "../util/fetcher"

export const $state = atom({
  key: "market-items::state",
  default: [],
})

export const $status = atom({
  key: "market-items::status",
  default: IDLE,
})

export function useMarketItems() {
  const url = process.env.REACT_APP_API_MARKET_ITEMS_LIST
  const [status, setStatus] = useRecoilState($status)
  const [items, setItems] = useRecoilState($state)

  useSWR(url, fetcher, {
    initialData: items,
    refreshInterval: 10,
    errorRetryCount: 10,
    onLoadingSlow: () => {
      setStatus(LOADING)
    },
    onSuccess: ({latestSaleOffers}) => {
      setStatus(IDLE)
      setItems(latestSaleOffers)
    },
    onError: error => {
      console.log("Failed to fetch market items.", error)
    },
  })

  const asMap = new Map(items.map(item => [item.saleItemId, item]))

  return {
    items,
    status,
    has(item) {
      return asMap.has(item.id || item.saleItemId)
    },
  }
}
