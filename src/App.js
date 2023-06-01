import React, { useState } from "react";
import { LexRuntimeV2 } from "aws-sdk";
import sendBtn from "./send-message.png";
import "./style.css";

const AWS = require("aws-sdk");

const LexChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("I want to order pizza");
  const [imageResponseCard, setImageResponseCard] = useState([]);
  const [sessionId, setSessionId] = useState(`${Date.now()}`);
  
  const handleSubmit = async (event) => {
    if (event.preventDefault) event?.preventDefault();
    const temptext = event.isImageCard ? event.text : text;
    const tempMessage = [
      ...messages,
      {
        isSend: true,
        content: temptext,
      },
    ];
    setText("");
    setMessages(tempMessage);
    AWS.config.region = 'us-east-1';
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: process.env.REACT_APP_LEXBOT_IDENTITY_KEY // change the Identity Pool
    });
    const client = new LexRuntimeV2({
      apiVersions: "2020-08-07",
      correctClockSkew: true,
      region: "us-east-1",
    });

    client.recognizeText(
      {
        botId: process.env.REACT_APP_BOT_ID,
        botAliasId: process.env.REACT_APP_BOT_ALIAS_ID,
        localeId: process.env.REACT_APP_BOT_LOCALE_ID,
        text: temptext,
        sessionId: sessionId,
      },
      (err, data) => {
        if (err) {
          console.error(err);
          setMessages([...tempMessage, {
            isSend: false,
            isImageResponseCard: false,
            content: "Hello, Sorry to say that, We are unable to procced your request.",
          }])
        } else {
          const messages = data.messages ?? []
          if (messages) {
           const dataMessage = messages.map((element, index)=>{
              return {
                messages: element,
                isSend: false,
                isImageResponseCard: element.contentType === "ImageResponseCard",
                content: element.content ?? element.imageResponseCard.title
              }
            });
            setMessages([...tempMessage, ...dataMessage] ?? []);
          }
          if (data.messages[0].contentType === "ImageResponseCard") {
            setImageResponseCard(data.messages[0].imageResponseCard);
          }
          setText("");
        }
        if (data.sessionState) {
          if (data.sessionState?.dialogAction.type === "Close") {
            client.deleteSession({
              botId: process.env.REACT_APP_BOT_ID,
              botAliasId: process.env.REACT_APP_BOT_ALIAS_ID,
              localeId: process.env.REACT_APP_BOT_LOCALE_ID,
              sessionId: sessionId,
            });
            setSessionId(`${Date.now()}`);
          }
        }
      }
    );
  };

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: "2-digit" });

  return (
    <div className="chatbot-container">
      <div id="header">
        <h1>Pizza Order Chatbot 🍕</h1>
      </div>
      <div id="chatbot">
        <div id="conversation">
          {messages.map((message, index) => (
            <>
              <div
                className={`chatbot-message ${
                  message.isSend ? "user-message" : "chatbot"
                }`}
              >
                <p className={`chatbot-text`} senttime={currentTime}>{message?.content}</p>
              </div>
              <div
                className={`chatbot-message ${
                  message.isSend ? "user-message" : "chatbot"
                }`}
              >
              </div>
              {message.isImageResponseCard ? (
                  <div className="chatbot-message-card chatbot">
                    <div className="card">
                    {imageResponseCard.imageUrl ? (<img className="imgRes" src={imageResponseCard.imageUrl} alt="imagesResponses" />):(<></>)}
                      <div className="card__details">
                        <div className="name">{imageResponseCard.title}</div>
                        {imageResponseCard.subtitle ? (<p className="p-desc">{imageResponseCard.subtitle}</p>):(<></>)}
                        {imageResponseCard.buttons.map((card) => {
                          return (
                            <button className="buttonRes" onClick={() => {
                              handleSubmit({
                                isImageCard: true,
                                text: card.text,
                              });
                            }}>{card.text}</button>
                          );
                          })}
                      </div>
                    </div>
                  </div>
                ) : (<></>)}
            </>
          ))}
        </div>
        <form id="input-form">
          <div className="message-container">
            <input
              id="input-field"
              type="text"
              placeholder="Type your message here"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <button id="submit-button" disabled={!text} type="submit" onClick={handleSubmit}>
              <img className="send-icon" src={sendBtn} alt="" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LexChatbot;
