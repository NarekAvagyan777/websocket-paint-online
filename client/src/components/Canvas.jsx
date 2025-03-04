import React, { useEffect, useRef, useState } from "react";
import "../styles/canvas.scss";
import { observer } from "mobx-react-lite";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import Brush from "../tools/Brush";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { useParams } from "react-router-dom";
import Rect from "../tools/Rect";
import axios from "axios";

const Canvas = observer(() => {
  const canvasRef = useRef();
  const usernameRef = useRef();
  const [modal, setModal] = useState(true);
  const [error, setError] = useState(false);
  const params = useParams();

  useEffect(() => {
    canvasState.setCanvas(canvasRef.current);
    let ctx = canvasRef.current.getContext("2d");
    axios
      .get(`http://localhost:5000/image?id=${params.id}`)
      .then((response) => {
        const img = new Image();
        img.src = response.data;
        img.onload = () => {
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          ctx.drawImage(
            img,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
        };
      });
  }, []);

  useEffect(() => {
    if (canvasState.username) {
      const socket = new WebSocket(`ws://localhost:5000/`);
      canvasState.setSocket(socket);

      canvasState.setSessionId(params.id);
      toolState.setTool(new Brush(canvasRef.current, socket, params.id));
      socket.onopen = () => {
        console.log("Connection is set");
        socket.send(
          JSON.stringify({
            id: params.id,
            username: canvasState.username,
            method: "connection",
          })
        );
      };

      socket.onmessage = (event) => {
        console.log("Event: ", JSON.parse(event.data));
        let msg = JSON.parse(event.data);
        switch (msg.method) {
          case "connection":
            console.log(`User ${msg.username} connected`);
            break;
          case "draw":
            drawHandler(msg);
            break;
        }
      };
    }
  }, [canvasState.username]);

  const drawHandler = (msg) => {
    const figure = msg.figure;
    const ctx = canvasRef.current.getContext("2d");
    switch (figure.type) {
      case "brush":
        Brush.draw(ctx, figure.x, figure.y);
        break;
      case "rect":
        Rect.staticDraw(
          ctx,
          figure.x,
          figure.y,
          figure.width,
          figure.height,
          figure.color
        );
        break;
      case "finish":
        ctx.beginPath();
        break;
    }
  };

  const mouseDownHandler = () => {
    canvasState.pushToUndo(canvasRef.current.toDataURL());
    axios
      .post(`http://localhost:5000/image?id=${params.id}`, {
        img: canvasRef.current.toDataURL(),
      })
      .then((response) => console.log(response.data));
  };

  const connectHandler = () => {
    if (usernameRef.current.value.trim()) {
      canvasState.setUsername(usernameRef.current.value);
      setError(false);
      setModal(false);
      return;
    }

    setError(true);
  };

  return (
    <div>
      <div className="canvas">
        <Modal
          show={modal}
          onHide={() => {}}
          backdrop="static"
          keyboard={false}
        >
          <Modal.Header>
            <Modal.Title>Type Your name</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <input type="text" placeholder="Name" ref={usernameRef} />
            {error && <p className="error_text">Name can't be empty</p>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => connectHandler()}>
              Join
            </Button>
          </Modal.Footer>
        </Modal>
        <canvas
          onMouseDown={() => mouseDownHandler()}
          ref={canvasRef}
          width={600}
          height={400}
        />
      </div>
    </div>
  );
});

export default Canvas;
