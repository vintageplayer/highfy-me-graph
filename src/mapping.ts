import { BigInt, log } from "@graphprotocol/graph-ts"
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
  // Check if account already exists
  let accountEntity = Account.load(event.params.accountAddress.toHex());
  // Create An Account if not Already Present
  if (!accountEntity) {
    let accountEntity = new Account(event.params.accountAddress.toHex());
    accountEntity.accountAddress = event.params.accountAddress;
    accountEntity.keyCID = event.params.keyCID;
    // Giving a default 5 credits to every new user sign up
    accountEntity.credits = BigInt.fromI32(5);
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

  // Creating a Default Entry in INBOX if not already present
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
    if (event.params.credits > BigInt.fromI32(0) && from.credits >= event.params.credits) {
      mailEntity.receiverLabel = "COLLECT";
      mailEntity.creditStatus = "PENDING";
      mailEntity.credits = event.params.credits;
      from.credits = from.credits - event.params.credits;
      from.save()
    } else {
      mailEntity.receiverLabel = getReceiverLabel(from, to);
      mailEntity.creditStatus = "INVALID";
      mailEntity.credits = BigInt.fromI32(0);
    }
    mailEntity.save();
  }
}

export function handleActionOnMail(event: actionOnMail): void {
   let email = MailItem.load(event.params.dataCID);
   let from = Account.load(event.params.from.toHex());
   let to = Account.load(event.params.to.toHex());

   if (email && from && to && (email.from.id == from.id) && (email.to.id == to.id)) {
    if (email.creditStatus == 'PENDING') {
      const receiverId = to.get('id')!.toString();
      const senderId = from.get('id')!.toString();
      const relationId = `${receiverId}_${senderId}`;
      let relationEntity = ReceiverLabel.load(relationId)!;
      if (event.params.action == 'ACCEPT_MAIL') {
        email.creditStatus = 'COLLECTED';
        email.receiverLabel = 'INBOX';
        relationEntity.mailLabel = "INBOX";
        relationEntity.save()
        to.credits = to.credits + email.credits;
        to.save()
      } else if (event.params.action == 'REFUND_MAIL') {
        email.creditStatus = 'REFUNDED';
        email.receiverLabel = 'INBOX';
        relationEntity.mailLabel = "INBOX";
        relationEntity.save()
        from.credits = from.credits + email.credits;
        from.save()
      } else if (event.params.action == 'SPAM_MAIL') {
        email.creditStatus = 'SPAM';
        email.receiverLabel = 'SPAM';
        relationEntity.mailLabel = "SPAM";
        relationEntity.save()
        to.credits = to.credits + email.credits;
        to.save()
      }
    } else {
      email.receiverLabel = event.params.action;
      log.info('Mail not of pending credits status', [])
    }
    email.save();
   }
}

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