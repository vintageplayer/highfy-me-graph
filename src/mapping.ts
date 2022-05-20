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

export function handleMailSent(event: mailSent): void {
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

export function handleActionOnMail(event: actionOnMail): void {}

export function handleSenderLabelUpdated(event: senderLabelUpdated): void {
  let from = Account.load(event.params.from.toHex());
  let to = Account.load(event.params.to.toHex());
  if (from && to) {
    const receiverId = to.get('id')!;
    const senderId = from.get('id')!;
    const relationId = `${receiverId}_${senderId}`;
    let relationEntity = ReceiverLabel.load(relationId);
    if (!relationEntity) {
      relationEntity = generateRelation(from, to, event.params.receiverRelationLabel);
    } else {
      relationEntity.mailLabel = event.params.receiverRelationLabel;
      relationEntity.save();
    }
  }
}

export function handleCreditsAdded(event: creditsAdded): void {
  const user = Account.load(event.params.user.toHex());
  if (user) {
    user.credits = user.credits + event.params.amount;
    user.save()
  }
}

export function handleCreditsRemoved(event: creditsRemoved): void {
  const user = Account.load(event.params.user.toHex());
  if (user) {
    if (event.params.amount <= user.credits){
      user.credits = user.credits - event.params.amount;      
      user.save()
    }
  }  
}

export function handleCreditsTransferred(event: creditsTransferred): void {
  const from = Account.load(event.params.from.toHex());
  const to = Account.load(event.params.to.toHex());
  if (from && to){
    const amount = event.params.amount;
    if (from.credits >= amount) {
      from.credits = from.credits - amount;
      to.credits = to.credits + amount;
      from.save()
      to.save()
    }
  }
}
