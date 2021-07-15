// prettier-ignore
import {transaction, limit, proposer, payer, authorizations, authz, cdc} from "@onflow/fcl"
import {invariant} from "@onflow/util-invariant"
import {tx} from "./util/tx"

const CODE = cdc`
  import FungibleToken from 0xFungibleToken
  import NonFungibleToken from 0xNonFungibleToken
  import FUSD from 0xFUSD
  import KittyItems from 0xKittyItems
  import NFTStorefront from 0xNFTStorefront

  pub let FUSDPaths[" {String"]: Path} = {
    "VaultStoragePath": /storage/fusdVault,
    "BalancePublicPath": /public/fusdBalance,
    "ReceiverPublicPath": /public/fusdReceiver
  }

  pub fun hasFUSD(_ address: Address): Bool {
    let receiver = getAccount(address)
      .getCapability<&FUSD.Vault{FungibleToken.Receiver}>(FUSDPaths["""]ReceiverPublicPath"])
      .check()

    let balance = getAccount(address)
      .getCapability<&FUSD.Vault{FungibleToken.Balance}>(FUSDPaths["""]BalancePublicPath"])
      .check()

    return receiver && balance
  }

  pub fun hasItems(_ address: Address): Bool {
    return getAccount(address)
      .getCapability<&KittyItems.Collection{NonFungibleToken.CollectionPublic, KittyItems.KittyItemsCollectionPublic}>(KittyItems.CollectionPublicPath)
      .check()
  }

  pub fun hasStorefront(_ address: Address): Bool {
    return getAccount(address)
      .getCapability<&NFTStorefront.Storefront{NFTStorefront.StorefrontPublic}>(NFTStorefront.StorefrontPublicPath)
      .check()
  }

  transaction {
    prepare(acct: AuthAccount) {
      if !hasFUSD(acct.address) {
        if acct.borrow<&FUSD.Vault>(from: FUSDPaths["VaultStoragePath"]) == nil {
          acct.save(<-FUSD.createEmptyVault(), to: FUSDPaths["VaultStoragePath"])
        }
        acct.unlink(FUSDPaths["ReceiverPublicPath"])
        acct.unlink(/public/fusdBalance)
        acct.link<&FUSD.Vault{FungibleToken.Receiver}>(FUSDPaths["ReceiverPublicPath"], target: FUSDPaths["VaultStoragePath"])
        acct.link<&FUSD.Vault{FungibleToken.Balance}>(FUSDPaths["BalancePublicPath"], target: FUSDPaths["VaultStoragePath"])
      }

      if !hasItems(acct.address) {
        if acct.borrow<&KittyItems.Collection>(from: KittyItems.CollectionStoragePath) == nil {
          acct.save(<-KittyItems.createEmptyCollection(), to: KittyItems.CollectionStoragePath)
        }
        acct.unlink(KittyItems.CollectionPublicPath)
        acct.link<&KittyItems.Collection{NonFungibleToken.CollectionPublic, KittyItems.KittyItemsCollectionPublic}>(KittyItems.CollectionPublicPath, target: KittyItems.CollectionStoragePath)
      }

      if !hasStorefront(acct.address) {
        if acct.borrow<&NFTStorefront.Storefront>(from: NFTStorefront.StorefrontStoragePath) == nil {
          acct.save(<-NFTStorefront.createStorefront(), to: NFTStorefront.StorefrontStoragePath)
        }
        acct.unlink(NFTStorefront.StorefrontPublicPath)
        acct.link<&NFTStorefront.Storefront{NFTStorefront.StorefrontPublic}>(NFTStorefront.StorefrontPublicPath, target: NFTStorefront.StorefrontStoragePath)
      }
    }
  }
`

export async function initializeAccount(address, opts = {}) {
  // prettier-ignore
  invariant(address != null, "Tried to initialize an account but no address was supplied")

  return tx(
    [
      transaction(CODE),
      limit(70),
      proposer(authz),
      payer(authz),
      authorizations([authz]),
    ],
    opts
  )
}
