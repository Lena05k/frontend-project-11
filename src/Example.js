// @ts-check

export default class Example {
  constructor(element) {
    this.element = element;
  }

  init() {
    this.element.textContent = 'hello!';
    console.log('ehu!');
  }
}
