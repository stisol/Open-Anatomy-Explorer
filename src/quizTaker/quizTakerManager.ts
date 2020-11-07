import QuizMasterManager from "../quizmaster/quizMasterManager";
import { LabelManager } from "../labels/labelManager";
import { QuestionType, QuestionName, QuestionLocate } from "../quizmaster/Question";
import { QuizTakerUi } from "./QuizTakerUi";
import { Answer } from "./Answer";
import { Label } from "../labels/Label";

export default class QuizTakerManager {
    private quizMasterManager: QuizMasterManager;
    private labelManager: LabelManager;
    private ui: QuizTakerUi;
    private answers: Answer[] = [];
    private questionIndex = -1;

    public constructor(quizMasterManager: QuizMasterManager, labelManager: LabelManager) {
        this.quizMasterManager = quizMasterManager;
        this.labelManager = labelManager;

        const quizUi = document.getElementById("quizzer") as HTMLDivElement;
        quizUi.classList.remove("hide");

        labelManager.setOnActiveLabelChangeHandler(this.selectedLabelChanged.bind(this));

        this.ui = new QuizTakerUi();
        this.ui.bind(this.ui.begin, this.start.bind(this));
    }

    private start(): void {
        const ui = this.ui;
        ui.hide(ui.start);
        ui.show(ui.question);
        ui.unbind(ui.begin);
        ui.bind(ui.submit, this.submitAnswer.bind(this));
        ui.bind(ui.next, this.nextQuestion.bind(this));
        this.nextQuestion();
    }

    private nextQuestion(): void {
        const ui = this.ui;
        ui.hideMany(ui.next, ui.correct, ui.wrong, ui.answerText, ui.answerLabel);
        ui.enable(ui.answerText);
        ui.clearInput(ui.answerText);
        ui.show(ui.submit);

        this.questionIndex++;
        if (this.questionIndex >= this.quizMasterManager.questionCount()) {
            this.finish();
            return;
        }

        const question = this.quizMasterManager.getQuestion(this.questionIndex);
        ui.setText(ui.questionText, question.textPrompt);

        switch (question.questionType) {
            case QuestionType.Name: {
                ui.show(ui.answerText);

                // Move camera and marker to the label in question.
                const q = question as QuestionName;
                const label = this.labelManager.getLabel(q.labelId);
                if (label == null) throw `Could not find label with id ${q.labelId}`;
                this.labelManager.moveCameraToLabel(label);
                this.labelManager.moveLightToLabel(label);

                this.labelManager.setVisibility(true);
                break;
            }
            case QuestionType.Locate: {
                ui.show(ui.answerLabel);
                const q = question as QuestionLocate;
                this.labelManager.setVisibility(q.showRegions);
                break;
            }
        }
    }

    private submitAnswer(): void {
        const ui = this.ui;

        const question = this.quizMasterManager.getQuestion(this.questionIndex);
        let correct;
        switch (question.questionType) {
            case QuestionType.Name: {
                const q = question as QuestionName;
                const input = ui.getInput(ui.answerText);
                const answer = q.textAnswer;
                correct = input.toLowerCase() == answer.toLowerCase();
                this.answers.push(new Answer(this.questionIndex, input, answer, correct));
                break;
            }
            case QuestionType.Locate: {
                const q = question as QuestionLocate;
                const answer = this.labelManager.getLabel(q.labelId);
                const input = this.labelManager.lastClickedLabel();
                if (input == undefined) return;
                if (answer == null) {
                    const err = `Label ${q.labelId} not found.`;
                    alert(err);
                    throw err;
                }
                correct = answer.id == input.id;
                this.answers.push(new Answer(this.questionIndex, input.name, answer.name, correct));
                break;
            }
        }

        ui.show(correct ? ui.correct : ui.wrong);
        ui.disable(ui.answerText);
        ui.hide(ui.submit);
        ui.show(ui.next);
    }

    private finish(): void {
        const ui = this.ui;
        ui.unbind(ui.submit);
        ui.unbind(ui.next);
        ui.hide(ui.question);
        ui.show(ui.result);

        ui.renderAnswerTable(this.answers);
    }

    private selectedLabelChanged(label: Label): void {
        const ui = this.ui;
        const text = "Selected: " + label.name;
        ui.setText(ui.answerLabel, text);
    }
}