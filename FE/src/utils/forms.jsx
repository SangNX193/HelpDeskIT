function clearInputValidity(event) {
    event.target.setCustomValidity("");
}

function setInputValidityMessage(message) {
    return (event) => {
        event.target.setCustomValidity(message);
    };
}
