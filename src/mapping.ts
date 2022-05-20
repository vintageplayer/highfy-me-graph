import { BigInt } from "@graphprotocol/graph-ts"
import {
  AccountCreated,
  mailSent,
  actionOnMail,
  creditsAdded,
  creditsRemoved,
  creditsTransferred,
  senderLabelUpdated
} from "../generated/Mail/Mail"
import { Account, MailItem, ReceiverLabel } from "./schema"

export function handleAccountCreated(event: AccountCreated): void {
  let accountEntity = Account.load(event.params.accountAddress.toHex());

  if (!accountEntity) {
    let accountEntity = new Account(event.params.accountAddress.toHex());
    accountEntity.accountAddress = event.params.accountAddress;
    accountEntity.keyCID = event.params.keyCID;
    accountEntity.credits = BigInt.fromI32(0);
    accountEntity.save();
  }
}

export function generateRelation(from: Account , to: Account, label: string): ReceiverLabel {
  const receiverId = to.get('id')!;
  const senderId = from.get('id')!;

  const relationId = `${receiverId}_${senderId}`;
  let relationEntity = new ReceiverLabel(relationId);
  relationEntity.from = from;
  relationEntity.to = to;
  relationEntity.mailLabel = label;
  relationEntity.save();

  return relationEntity;
}
export function getReceiverLabel(from: Account , to: Account): string {
  const receiverId = to.get('id')!;
  const senderId = from.get('id')!;

  const senderRelationId = `${senderId}_${receiverId}`;
  let senderRelationEntity = ReceiverLabel.load(senderRelationId);
  if (!senderRelationEntity) {
    generateRelation(to, from, "INBOX");
  } else if (senderRelationEntity.get('mailLabel')!.toString() === 'SPAM') {
    senderRelationEntity.mailLabel = "INBOX"
  }

  const receiverRelationId = `${receiverId}_${senderId}`;
  let receiverRelationEntity = ReceiverLabel.load(receiverRelationId);
  if (!receiverRelationEntity) {
    receiverRelationEntity = generateRelation(from, to, "SPAM");
  }
  return receiverRelationEntity.get("mailLabel")!.toString();
}

export function handlemailSent(event: mailSent): void {
  let email = MailItem.load(event.params.dataCID);
  let from = Account.load(event.params.from.toHex());
  let to = Account.load(event.params.to.toHex());

  if (!email && from && to) {    
    let mailEntity = new MailItem(event.params.dataCID);
    mailEntity.from = Account.load(event.params.from.toHex())!;
    mailEntity.to = Account.load(event.params.to.toHex())!;
    mailEntity.dataCID = event.params.dataCID;
    mailEntity.receiverLabel = getReceiverLabel(from, to);
    mailEntity.save();
  }
}

export function handleactionOnMail(event: actionOnMail): void {}

export function handlecreditsAdded(event: creditsAdded): void {}

export function handlecreditsRemoved(event: creditsRemoved): void {}

export function handlecreditsTransferred(event: creditsTransferred): void {}

export function handlesenderLabelUpdated(event: senderLabelUpdated): void {}
