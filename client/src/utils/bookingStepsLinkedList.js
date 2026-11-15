/**
 * Doubly Linked List implementation for the Booking Wizard Steps.
 * Connects "Select Shuttle" (Node 1) and "Choose Stop" (Node 2) sequentially,
 * such that jumping to subsequent steps is only allowed after completing the prior step.
 */

export class StepNode {
  constructor({ id, key, title, subtitle }) {
    this.id = id;
    this.key = key;
    this.title = title;
    this.subtitle = subtitle;
    this.prev = null;
    this.next = null;
  }
}

export class BookingStepLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.nodeMap = new Map();
  }

  addStep(stepConfig) {
    const node = new StepNode(stepConfig);
    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      node.prev = this.tail;
      this.tail.next = node;
      this.tail = node;
    }
    this.nodeMap.set(node.id, node);
    return node;
  }

  getNode(id) {
    return this.nodeMap.get(id);
  }

  /**
   * Evaluates if a given step node is complete based on booking state.
   */
  isStepCompleted(id, state) {
    const { selectedSlot, selectedStop, selectedSeat, confirmedPass } = state;
    switch (id) {
      case 1:
        // Step 1: Select Shuttle is complete when a shuttle slot is selected
        return Boolean(selectedSlot);
      case 2:
        // Step 2: Choose Stop is complete when a stop is chosen
        return Boolean(selectedStop);
      case 3:
        // Step 3: Seat selection is complete when a seat is chosen
        return Boolean(selectedSeat);
      case 4:
        return Boolean(confirmedPass);
      default:
        return false;
    }
  }

  /**
   * Checks whether the user can jump/navigate to the target step id.
   * Traverses from head through predecessors in the linked list:
   * Every previous node in the list MUST be completed before jumping to target.
   */
  canNavigateTo(targetId, state) {
    const targetNode = this.nodeMap.get(targetId);
    if (!targetNode) return false;

    // Head node (Step 1) is always accessible
    if (!targetNode.prev) return true;

    // Must have all predecessor steps in the chain completed
    let curr = targetNode.prev;
    while (curr) {
      if (!this.isStepCompleted(curr.id, state)) {
        return false;
      }
      curr = curr.prev;
    }
    return true;
  }

  /**
   * Advances to next step node if current step is completed.
   */
  getNextStep(currentId, state) {
    const current = this.nodeMap.get(currentId);
    if (!current) return currentId;
    if (this.isStepCompleted(current.id, state) && current.next) {
      return current.next.id;
    }
    return currentId;
  }

  /**
   * Goes back to previous step node in the linked list.
   */
  getPrevStep(currentId) {
    const current = this.nodeMap.get(currentId);
    if (!current || !current.prev) return 1;
    return current.prev.id;
  }

  toArray() {
    const list = [];
    let curr = this.head;
    while (curr) {
      list.push(curr);
      curr = curr.next;
    }
    return list;
  }
}

// Singleton linked list configuration for the booking flow
export const bookingStepList = new BookingStepLinkedList();

export const STEP_SELECT_SHUTTLE = 1;
export const STEP_CHOOSE_STOP = 2;
export const STEP_SEAT_SELECTION = 3;
export const STEP_BOARDING_PASS = 4;

bookingStepList.addStep({
  id: STEP_SELECT_SHUTTLE,
  key: 'select-shuttle',
  title: 'Select Shuttle',
  subtitle: 'Time & Route'
});

bookingStepList.addStep({
  id: STEP_CHOOSE_STOP,
  key: 'choose-stop',
  title: 'Choose Stop',
  subtitle: 'Where you board / get off'
});

bookingStepList.addStep({
  id: STEP_SEAT_SELECTION,
  key: 'seat-selection',
  title: 'Seat Selection',
  subtitle: 'Coach Blueprint'
});

bookingStepList.addStep({
  id: STEP_BOARDING_PASS,
  key: 'boarding-pass',
  title: 'Boarding Pass',
  subtitle: 'Digital QR Ticket'
});

